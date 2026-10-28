"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getSocketClient } from "@/lib/socket";
import { useSession } from "@/lib/session";
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
  Info as InfoIcon,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  ChevronDown,
  UserPlus,
  Users,
  MessageSquare,
  User,
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
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
  RotateCcw,
  Ban,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MediaPickerModal, MediaFileItem } from "@/components/media/media-picker-modal";

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
  reactions?: Record<string, string[]>;
  urlPreviews?: ChatMessageUrlPreview[];
  voiceNote?: ChatMessageVoiceNote;
  poll?: ChatMessagePoll;
}

export interface ConversationSummaryItem {
  threadId: string;
  type: "direct" | "group";
  title: string;
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

const AVATAR_COLORS = [
  "bg-teal-700 text-white",
  "bg-emerald-600 text-white",
  "bg-blue-600 text-white",
  "bg-indigo-600 text-white",
  "bg-cyan-600 text-white",
  "bg-slate-600 text-white",
  "bg-violet-600 text-white",
  "bg-teal-800 text-white",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
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
        className="size-8 rounded-full bg-teal-600/10 hover:bg-teal-600/20 text-teal-700 dark:text-teal-300 flex-shrink-0"
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
            className="h-full bg-teal-600 dark:bg-teal-400 transition-all duration-100"
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

  const [searchQuery, setSearchQuery] = useState("");
  const [filterFilter, setFilterFilter] = useState<"all" | "unread">("all");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
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
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDescription, setEditGroupDescription] = useState("");
  const [editGroupAvatarUrl, setEditGroupAvatarUrl] = useState("");

  const [transferOwnershipOpen, setTransferOwnershipOpen] = useState(false);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState("");
  const [leaveGroupOpen, setLeaveGroupOpen] = useState(false);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedAddMemberId, setSelectedAddMemberId] = useState("");

  // Message Actions: Reply, Edit, Forward, Delete
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessageItem | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessageItem | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [forwardMessage, setForwardMessage] = useState<ChatMessageItem | null>(null);
  const [forwardTargetThreadId, setForwardTargetThreadId] = useState("");

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

  // Emoji Popover for composer
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

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
          avatarLetter: title.charAt(0).toUpperCase(),
          avatarColor: getAvatarColor(title),
          lastMessage: c.lastMessage || "",
          lastMessageTime: c.lastMessageTime
            ? new Date(c.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          unreadCount: c.unreadCount || 0,
          status: isOnline ? "online" : "offline",
          otherParticipantId: isDirect ? c.id : undefined,
          groupId: !isDirect ? c.id : undefined,
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

  // Group Activity Events Query for Activity Tab
  const {
    data: groupActivityEvents = [],
    isLoading: isActivityLoading,
    refetch: refetchGroupActivity,
  } = useQuery<any[]>({
    queryKey: ["chat", "group_activity", activeGroupId],
    queryFn: async () => {
      if (!activeGroupId || activeThreadType !== "group") return [];
      try {
        const res: any = await api.get(`/api/chat/groups/${activeGroupId}/activity`);
        return Array.isArray(res) ? res : res?.events || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(activeGroupId && activeThreadType === "group" && infoTab === "activity"),
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
          const targetId = urlThreadId.replace("direct_", "");
          setActiveThreadId(urlThreadId);
          setActiveThreadTitle("Direct Chat");
          setActiveThreadType("direct");
          setActiveTargetUserId(targetId);
          return;
        } else if (urlThreadId.startsWith("group_")) {
          const gId = urlThreadId.replace("group_", "");
          setActiveThreadId(urlThreadId);
          setActiveThreadTitle("Group Chat");
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
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, []);

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
      console.log("[SOCKET_INCOMING]", Date.now(), "activeThread:", activeThreadId, "msgThread:", threadId, "content:", msg?.content);

      if (threadId === activeThreadId && msg && msg.id) {
        setOptimisticMessages((prev) =>
          prev.filter((m) => m.clientTempId !== msg.clientTempId && m.id !== msg.id)
        );

        const formatted = formatMessageItem(msg, currentUserId);
        queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
          console.log("[SET_QUERY_DATA] old count:", old?.messages?.length, "new id:", formatted.id);
          if (!old || !old.messages) return { messages: [formatted], hasMore: false };
          const exists = old.messages.some((m: any) => m.id === formatted.id);
          if (exists) {
            return {
              ...old,
              messages: old.messages.map((m: any) => (m.id === formatted.id ? formatted : m)),
            };
          }
          return {
            ...old,
            messages: [...old.messages, formatted],
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

    const handleGroupUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
    };

    // ── WebRTC Signaling Listeners ──
    const handleIncomingCall = (data: any) => {
      if (incomingCallTimerRef.current) {
        clearTimeout(incomingCallTimerRef.current);
        incomingCallTimerRef.current = null;
      }
      // Auto-reject on callee side after 30 seconds without answer
      incomingCallTimerRef.current = setTimeout(() => {
        handleRejectIncomingCall("timeout");
      }, 30000);

      setIncomingCall({
        callId: data.callId,
        fromUserId: data.fromUserId,
        type: data.type || data.callType || "audio",
        callerName: data.callerName || "Colleague",
        callerPhone: data.callerPhone,
        callerEmail: data.callerEmail,
        callerAvatarUrl: data.callerAvatarUrl,
        threadId: data.threadId,
      });
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
      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }
      toast.warning(data?.message || "User is currently busy on another call.");
      cleanUpMedia();
      setActiveCallModalOpen(false);
      setCallStatus("ended");
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
      if (!pc || !signal) return;

      try {
        if (signal.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("call:signal", {
            toUserId: data.fromUserId,
            targetUserId: data.fromUserId,
            signal: { type: "answer", sdp: answer },
          });
        } else if (signal.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === "candidate" && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
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

    // Call signaling events
    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:cancelled", handleCallCancelled);
    socket.on("call:busy", handleCallBusy);
    socket.on("call:timeout", handleCallTimeout);
    socket.on("call:signal", handleCallSignal);
    socket.on("call:ended", handleCallEnded);

    return () => {
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

      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:cancelled", handleCallCancelled);
      socket.off("call:busy", handleCallBusy);
      socket.off("call:timeout", handleCallTimeout);
      socket.off("call:signal", handleCallSignal);
      socket.off("call:ended", handleCallEnded);
    };
  }, [activeThreadId, currentUserId, queryClient, cleanUpMedia, activeCallTargetId]);

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
      setEditGroupOpen(false);
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "group_activity", activeGroupId] });
      if (updatedGroup?.name) setActiveThreadTitle(updatedGroup.name);
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

  // Add Member to Group
  const addGroupMemberMutation = useMutation({
    mutationFn: async (data: { groupId: string; userId: string }) => {
      const res: any = await api.post(`/api/chat/groups/${data.groupId}/members`, {
        userId: data.userId,
      });
      return res;
    },
    onSuccess: () => {
      toast.success("Colleague added to group");
      setAddMemberOpen(false);
      setSelectedAddMemberId("");
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to add member");
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
  // WebRTC CALL HANDLERS (Real Audio & Video)
  // ──────────────────────────────────────────────────────────────────────────
  const handleInitiateCall = async (
    type: "audio" | "video",
    targetUserId: string,
    name: string,
    phone = "",
    email = ""
  ) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Your browser does not support WebRTC media capture.");
      return;
    }

    try {
      // Request media permission on user action
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      localStreamRef.current = stream;
      setActiveCallType(type);
      setActiveCallTargetName(name);
      setActiveCallTargetPhone(phone);
      setActiveCallTargetEmail(email);
      setActiveCallTargetId(targetUserId);
      setActiveCallRole("caller");
      setCallStatus("calling");
      setCallDurationSeconds(0);
      setIsMuted(false);
      setIsVideoOff(false);
      setActiveCallModalOpen(true);

      // Create WebRTC Peer Connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Attach local stream to preview video
      if (type === "video" && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Handle ICE candidates
      const socket = getSocketClient();
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("call:signal", {
            toUserId: targetUserId,
            targetUserId: targetUserId,
            signal: { type: "candidate", candidate: event.candidate },
          });
        }
      };

      // Handle remote media track
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Emit call invite via socket
      const callId = `call_${Date.now()}`;
      setActiveCallId(callId);

      // 30-second ringing timeout
      if (callTimeoutTimerRef.current) clearTimeout(callTimeoutTimerRef.current);
      callTimeoutTimerRef.current = setTimeout(() => {
        const s = getSocketClient();
        if (s && targetUserId) {
          s.emit("call:timeout", {
            toUserId: targetUserId,
            targetUserId: targetUserId,
            callId,
            callType: type,
          });
        }
        toast.info("No answer. Call timed out.");
        cleanUpMedia();
        setActiveCallModalOpen(false);
        setCallStatus("ended");
        queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
      }, 30000);

      if (socket) {
        socket.emit("call:invite", {
          toUserId: targetUserId,
          targetUserId: targetUserId,
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
        toast.error("Microphone/Camera permission denied. Please allow access in browser permissions and retry.");
      } else {
        toast.error(`Media device error: ${err.message || "Failed to access devices"}`);
      }
      cleanUpMedia();
    }
  };

  // Accept Incoming Call (Callee)
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      const isVideoCall = incomingCall.type === "video";
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall,
      });

      localStreamRef.current = stream;
      setActiveCallType(incomingCall.type);
      setActiveCallTargetName(incomingCall.callerName);
      setActiveCallTargetPhone(incomingCall.callerPhone || "");
      setActiveCallTargetEmail(incomingCall.callerEmail || "");
      setActiveCallTargetId(incomingCall.fromUserId);
      setActiveCallId(incomingCall.callId);
      setActiveCallRole("callee");
      setCallStatus("connected");
      setCallDurationSeconds(0);
      setIsMuted(false);
      setIsVideoOff(false);
      setActiveCallModalOpen(true);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (isVideoCall && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const socket = getSocketClient();
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("call:signal", {
            toUserId: incomingCall.fromUserId,
            signal: { type: "candidate", candidate: event.candidate },
          });
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Emit accept
      if (socket) {
        socket.emit("call:accept", {
          toUserId: incomingCall.fromUserId,
          callId: incomingCall.callId,
        });
      }

      setIncomingCall(null);
    } catch (err: any) {
      toast.error(`Permission denied or device error: ${err.message}`);
      handleRejectIncomingCall("permission_denied");
    }
  };

  // Reject Incoming Call
  const handleRejectIncomingCall = (reason = "declined") => {
    if (!incomingCall) return;
    try {
      const socket = getSocketClient();
      if (socket) {
        socket.emit("call:reject", {
          toUserId: incomingCall.fromUserId,
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
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
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
      const res = await api.upload("/api/v1/media/upload", formData);
      const media = res.data;
      if (purpose === "newGroup") {
        setNewGroupAvatarUrl(media.url);
        setNewGroupAvatarMediaId(media.id);
      } else {
        setEditGroupAvatarUrl(media.url);
        setEditGroupAvatarMediaId(media.id);
      }
      toast.success("Group avatar uploaded to Media Library");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to upload group avatar");
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

  const isUserTyping = Object.values(typingUsers).some(Boolean);

  return (
    <div
      className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background border-t border-border font-sans"
      style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LEFT COLUMN: LISTS (CHATS / GROUPS / CONTACTS / CALLS)              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <aside className="w-[320px] flex-shrink-0 border-r border-border flex flex-col bg-card">
        {/* Top Header / Mode Switcher */}
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 font-bold text-lg text-foreground hover:text-primary transition-colors cursor-pointer">
                <span>
                  {mode === "chats"
                    ? "Personal Chat"
                    : mode === "groups"
                    ? "Chat Groups"
                    : mode === "contacts"
                    ? "Chat Contacts"
                    : "Call History"}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 font-sans">
              <DropdownMenuItem
                onClick={() => handleModeSelect("chats")}
                className={cn("cursor-pointer", mode === "chats" && "font-semibold bg-muted")}
              >
                <MessageSquare className="size-4 mr-2" /> Personal Chat
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleModeSelect("groups")}
                className={cn("cursor-pointer", mode === "groups" && "font-semibold bg-muted")}
              >
                <Users className="size-4 mr-2" /> Chat Groups
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleModeSelect("contacts")}
                className={cn("cursor-pointer", mode === "contacts" && "font-semibold bg-muted")}
              >
                <User className="size-4 mr-2" /> Chat Contacts
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleModeSelect("calls")}
                className={cn("cursor-pointer", mode === "calls" && "font-semibold bg-muted")}
              >
                <PhoneCall className="size-4 mr-2" /> Call History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1">
            {mode === "chats" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNewChatOpen(true)}
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
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
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
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
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                title="Schedule Meeting"
              >
                <CalendarPlus className="size-4" />
              </Button>
            )}
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
                  <RefreshCw className="size-5 animate-spin text-teal-600" />
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
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <MessageSquare className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No conversations yet</p>
                  <p className="text-[11px]">Click + to start communicating with colleagues.</p>
                </div>
              ) : (
                filteredConversations.map((item) => {
                  const isSelected = activeThreadId === item.threadId;
                  return (
                    <div
                      key={item.threadId}
                      onClick={() => {
                        setActiveThreadId(item.threadId);
                        setActiveThreadTitle(item.title);
                        setActiveThreadType(item.type);
                        setActiveTargetUserId(item.otherParticipantId || "");
                        setActiveGroupId(item.groupId || "");
                      }}
                      className={cn(
                        "group p-3 flex items-start gap-3 cursor-pointer transition-colors relative hover:bg-muted/50",
                        isSelected && "bg-muted/80"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className={cn(
                            "size-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs",
                            item.avatarColor
                          )}
                        >
                          {item.avatarLetter}
                        </div>
                        {item.type === "direct" && (
                          <span
                            className={cn(
                              "size-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-card",
                              item.status === "online" ? "bg-emerald-500" : "bg-muted-foreground/40"
                            )}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                            {item.isPinned && <Pin className="size-3 text-teal-600 flex-shrink-0" />}
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
                            item.isPinned ? "text-teal-600 opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <Pin className="size-3.5" />
                        </button>
                        {item.unreadCount > 0 && (
                          <Badge className="bg-teal-700 text-white text-[10px] h-4.5 px-1.5 rounded-full flex-shrink-0">
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
                  <RefreshCw className="size-5 animate-spin text-teal-600" />
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
                    className="mt-2 text-xs bg-teal-700 hover:bg-teal-800 text-white"
                    onClick={() => setCreateGroupOpen(true)}
                  >
                    <Plus className="size-3.5 mr-1" /> Create Group
                  </Button>
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const threadId = `group_${group.id}`;
                  const isSelected = activeThreadId === threadId;
                  return (
                    <div
                      key={group.id}
                      onClick={() => {
                        setActiveThreadId(threadId);
                        setActiveThreadTitle(group.name);
                        setActiveThreadType("group");
                        setActiveGroupId(group.id);
                        setActiveTargetUserId("");
                      }}
                      className={cn(
                        "group p-3 flex items-start gap-3 cursor-pointer transition-colors relative hover:bg-muted/50",
                        isSelected && "bg-muted/80"
                      )}
                    >
                      <div
                        className={cn(
                          "size-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0",
                          group.avatarColor
                        )}
                      >
                        {group.avatarLetter}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                            {group.isPinned && <Pin className="size-3 text-teal-600 flex-shrink-0" />}
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
                            group.isPinned ? "text-teal-600 opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <Pin className="size-3.5" />
                        </button>
                        {group.unreadCount && group.unreadCount > 0 ? (
                          <Badge className="bg-teal-700 text-white text-[10px] h-4.5 px-1.5 rounded-full flex-shrink-0">
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
                  <RefreshCw className="size-5 animate-spin text-teal-600" />
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
                            contact.status === "online" ? "bg-emerald-500" : "bg-muted-foreground/40"
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
                          className="size-7 text-muted-foreground hover:text-teal-700"
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
                          className="size-7 text-muted-foreground hover:text-teal-700"
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
                          className="h-7 px-2 text-xs text-teal-700 hover:text-teal-800"
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
                  className="w-full mt-2 text-xs bg-teal-700 hover:bg-teal-800 text-white gap-1.5"
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
      <section className="flex-1 flex flex-col bg-background min-w-0">
        {mode === "calls" ? (
          /* ─── FULL CALL HISTORY VIEW ─── */
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Call History</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Authoritative voice and video call lifecycle records, participant details, and durations.
                </p>
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
                  className="text-xs h-8.5 bg-teal-700 hover:bg-teal-800 text-white gap-1.5"
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
                        ? "bg-teal-700 text-white font-semibold shadow-xs"
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
                        ? "bg-teal-700 text-white font-semibold shadow-xs"
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
                        ? "bg-teal-700 text-white font-semibold shadow-xs"
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
                        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-teal-600" />
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
                                    "size-8 rounded-full flex items-center justify-center font-bold text-xs text-white",
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
                                  <PhoneIncoming className="size-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 dark:text-emerald-400">Incoming</span>
                                </>
                              ) : (
                                <>
                                  <PhoneOutgoing className="size-3.5 text-blue-600" />
                                  <span className="text-blue-700 dark:text-blue-400">Outgoing</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center text-xs font-medium gap-1.5">
                              {isVideo ? (
                                <>
                                  <Video className="size-3.5 text-purple-600" />
                                  <span className="text-purple-700 dark:text-purple-400">Video</span>
                                </>
                              ) : (
                                <>
                                  <Phone className="size-3.5 text-slate-600" />
                                  <span>Audio</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {call.status === "completed" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Completed
                              </span>
                            ) : call.status === "missed" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                Missed
                              </span>
                            ) : call.status === "rejected" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 capitalize">
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
                                className="size-7 text-muted-foreground hover:text-teal-700"
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
                                className="size-7 text-muted-foreground hover:text-teal-700"
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
                                className="size-7 text-muted-foreground hover:text-teal-700"
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
              <div className="flex items-center gap-3 min-w-0">
                {activeThreadType === "direct" && (participantProfile?.avatarUrl || activeContact?.avatarUrl) ? (
                  <img
                    src={participantProfile?.avatarUrl || activeContact?.avatarUrl || ""}
                    alt={activeThreadTitle}
                    className="size-9.5 rounded-full object-cover flex-shrink-0 shadow-xs"
                  />
                ) : (
                  <div
                    className={cn(
                      "size-9.5 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs",
                      getAvatarColor(activeThreadTitle)
                    )}
                  >
                    {(activeThreadTitle || "C").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-foreground truncate">{activeThreadTitle}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {activeThreadType === "direct" ? (
                      <>
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            onlineUserIds.includes(activeTargetUserId) ? "bg-emerald-500" : "bg-muted-foreground/40"
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

              <div className="flex items-center gap-1">
                {/* Search in Conversation Button */}
                <button
                  onClick={() => setInThreadSearchOpen((prev) => !prev)}
                  className={cn(
                    "p-2 rounded-lg transition-colors cursor-pointer",
                    inThreadSearchOpen
                      ? "text-teal-700 bg-teal-50 dark:bg-teal-950/40"
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
                      onClick={() => {
                        const firstOther = activeGroup?.members.find((m) => m.userId !== currentUserId);
                        handleInitiateCall(
                          "audio",
                          firstOther?.userId || activeGroupId,
                          `${activeThreadTitle} (Group Audio)`,
                          "",
                          ""
                        );
                      }}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Group Voice Call (WebRTC)"
                    >
                      <Phone className="size-4.5" />
                    </button>
                    <button
                      onClick={() => {
                        const firstOther = activeGroup?.members.find((m) => m.userId !== currentUserId);
                        handleInitiateCall(
                          "video",
                          firstOther?.userId || activeGroupId,
                          `${activeThreadTitle} (Group Video)`,
                          "",
                          ""
                        );
                      }}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Group Video Call (WebRTC)"
                    >
                      <Video className="size-4.5" />
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
                  onClick={() => setShowInfo((prev) => !prev)}
                  className={cn(
                    "p-2 rounded-lg transition-colors cursor-pointer",
                    showInfo
                      ? "text-teal-700 bg-teal-50 dark:bg-teal-950/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Toggle Details Panel"
                >
                  <InfoIcon className="size-4.5" />
                </button>
              </div>
            </div>

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
              <div className="px-4 py-1.5 bg-teal-50 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-900/40 flex items-center justify-between text-xs text-teal-900 dark:text-teal-100">
                <div className="flex items-center gap-2 truncate">
                  <Pin className="size-3.5 text-teal-600 flex-shrink-0" />
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
                isDraggingOver && "bg-teal-50/50 dark:bg-teal-950/20"
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
                  <RefreshCw className="size-4 animate-spin text-teal-600" />
                  <span>Loading older messages...</span>
                </div>
              )}

              {/* Drag overlay notice */}
              {isDraggingOver && (
                <div className="absolute inset-0 bg-teal-50/80 dark:bg-teal-950/80 z-20 flex flex-col items-center justify-center border-2 border-dashed border-teal-500 rounded-lg pointer-events-none">
                  <Paperclip className="size-10 text-teal-600 animate-bounce mb-2" />
                  <p className="text-sm font-bold text-teal-800 dark:text-teal-200">
                    Drop files here to upload to this conversation
                  </p>
                  <p className="text-xs text-teal-600">Documents, images, PDF (Max 30 MB)</p>
                </div>
              )}

              {isMessagesLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground space-y-2 flex-col">
                  <RefreshCw className="size-6 animate-spin text-teal-600" />
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
                  const isSent = msg.types === "sent";
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
                            <InfoIcon className="size-3 flex-shrink-0 text-teal-600" />
                            <span>{msg.content}</span>
                            {msg.time && (
                              <span className="text-[10px] opacity-75 font-mono">({msg.time})</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "group flex items-end gap-2.5 max-w-[85%]",
                            isSent ? "ml-auto flex-row-reverse" : "mr-auto"
                          )}
                        >
                      {!isSent && (
                        <div
                          className={cn(
                            "size-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0 shadow-2xs",
                            getAvatarColor(msg.senderName)
                          )}
                        >
                          {(msg.senderName || "U").charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="space-y-1 relative">
                        {/* Reply reference preview */}
                        {msg.replyTo && (
                          <div className="text-[10px] text-muted-foreground border-l-2 border-teal-600 pl-2 py-0.5 mb-1 bg-muted/40 rounded-r">
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
                              ? "bg-teal-700 text-white rounded-br-none"
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
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1">
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
                                          <FileText className="size-5 text-rose-600 flex-shrink-0" />
                                        ) : (
                                          <FileIcon className="size-5 text-teal-600 flex-shrink-0" />
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
                                          className="p-1 hover:bg-muted rounded text-teal-700 dark:text-teal-400"
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
                                      <BarChart2 className="size-3.5 text-teal-600" />
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
                                                  hasVoted && "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20"
                                                )}
                                              >
                                                <div
                                                  className="absolute inset-y-0 left-0 bg-teal-200/40 dark:bg-teal-800/20 pointer-events-none"
                                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                                <div className="relative flex items-center justify-between text-xs">
                                                  <div className="flex items-center gap-1.5">
                                                    {hasVoted ? (
                                                      <CheckSquare className="size-3.5 text-teal-600" />
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
                                          ? "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700"
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
                                        className="text-[11px] text-teal-600 hover:underline cursor-pointer font-medium"
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
                                                <AvatarFallback className="text-[9px] bg-teal-100 text-teal-800 font-bold">
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
                          {msg.isPinned && <Pin className="size-3 text-teal-600" />}
                          <span>{msg.time}</span>
                          {isSent && (
                            <>
                              {msg.status === "failed" ? (
                                <span className="text-destructive font-medium">Failed</span>
                              ) : msg.status === "pending" ? (
                                <Clock className="size-3 text-muted-foreground animate-spin" />
                              ) : msg.deliveryStatus === "seen" || msg.status === "read" ? (
                                <span title="Seen"><CheckCheck className="size-3.5 text-teal-600 dark:text-teal-400" /></span>
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
                              isSent ? "-left-24" : "-right-24"
                            )}
                          >
                            {/* Quick Emoji Reaction */}
                            <button
                              onClick={() => handleAddReaction(msg.id, "👍")}
                              className="p-1 hover:bg-muted rounded text-xs"
                              title="React Thumbs Up"
                            >
                              👍
                            </button>
                            <button
                              onClick={() => handleAddReaction(msg.id, "❤️")}
                              className="p-1 hover:bg-muted rounded text-xs"
                              title="React Heart"
                            >
                              ❤️
                            </button>

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
                  <div className="size-2 rounded-full bg-teal-600 animate-ping" />
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
                  <ArrowDown className="size-4 text-teal-700 dark:text-teal-400" />
                  {unreadBelowCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold">
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
                  <CornerUpLeft className="size-4 text-teal-600 flex-shrink-0" />
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
                          <div className="flex flex-col items-center justify-center text-rose-600">
                            <FileText className="size-6" />
                            <span className="text-[9px] font-bold mt-0.5">PDF</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-teal-600">
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
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-200">
                              From Media
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Remove Control */}
                      <button
                        type="button"
                        onClick={() => removeComposerAttachment(idx)}
                        className="absolute top-1.5 right-1.5 size-5 rounded-full bg-muted/80 hover:bg-destructive hover:text-white flex items-center justify-center text-muted-foreground transition-colors"
                        title="Remove attachment"
                      >
                        <X className="size-3" />
                      </button>

                      {/* Replace Control (For local file) */}
                      {item.file && (
                        <label className="absolute bottom-1.5 right-1.5 size-5 rounded-full bg-muted/80 hover:bg-teal-700 hover:text-white flex items-center justify-center text-muted-foreground transition-colors cursor-pointer" title="Replace file">
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
                  className="h-14 px-3 text-xs flex flex-col items-center justify-center gap-1 border-dashed border-teal-600/40 text-teal-800 dark:text-teal-300 hover:bg-teal-50/50 flex-shrink-0"
                >
                  <ImageIcon className="size-4" />
                  <span className="text-[10px] font-medium">+ Media Library</span>
                </Button>
              </div>
            )}

            {/* Message Composer / Voice Recording Bar */}
            {isRecordingVoice ? (
              <div className="p-3 border-t border-border bg-card flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 animate-pulse">
                  <div className="size-3 rounded-full bg-rose-600" />
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
                    className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
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
                    className="flex items-center justify-center size-8 rounded-full bg-teal-700 text-white hover:bg-teal-800 cursor-pointer"
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
                    className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
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
                              "size-5 rounded-full flex items-center justify-center font-bold text-[9px] text-white flex-shrink-0",
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
                      <Upload className="size-3.5 text-teal-600" />
                      <span>Upload from Device</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setMediaPickerPurpose("composer");
                        setMediaPickerOpen(true);
                      }}
                      className="gap-2 cursor-pointer"
                    >
                      <ImageIcon className="size-3.5 text-teal-600" />
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
                  className="flex-1 text-xs h-9 bg-muted/30 border-border/80 rounded-full px-4 focus-visible:ring-teal-600 font-sans"
                />

                {/* Emoji Inserter */}
                <DropdownMenu open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Insert emoji"
                    >
                      <Smile className="size-4.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="p-2 w-64 grid grid-cols-6 gap-1 font-sans">
                    {["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👏", "✅", "🚀", "✨", "🙏"].map(
                      (emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setMessageInput((prev) => prev + ` ${emoji} `);
                            setEmojiPickerOpen(false);
                          }}
                          className="size-8 text-lg flex items-center justify-center hover:bg-muted rounded"
                        >
                          {emoji}
                        </button>
                      )
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

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
                  className="rounded-full size-8.5 p-0 bg-teal-700 hover:bg-teal-800 text-white cursor-pointer shadow-xs disabled:opacity-50"
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
              className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
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
        <aside className="w-[300px] flex-shrink-0 border-l border-border bg-card flex flex-col overflow-y-auto">
          {/* Top Profile Card */}
          <div className="p-6 text-center border-b border-border/70 flex flex-col items-center">
            {activeThreadType === "direct" && (participantProfile?.avatarUrl || activeContact?.avatarUrl) ? (
              <img
                src={participantProfile?.avatarUrl || activeContact?.avatarUrl || ""}
                alt={activeThreadTitle}
                className="size-18 rounded-full object-cover mb-3 shadow-md"
              />
            ) : (
              <div
                className={cn(
                  "size-18 rounded-full flex items-center justify-center font-bold text-2xl text-white mb-3 shadow-md",
                  getAvatarColor(activeThreadTitle)
                )}
              >
                {(activeThreadTitle || "C").charAt(0).toUpperCase()}
              </div>
            )}

            <h3 className="font-bold text-base text-foreground truncate w-full">{activeThreadTitle}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeThreadType === "direct"
                ? participantProfile?.designation || activeContact?.designation || "Colleague"
                : `${activeGroup?.memberCount || 0} Members`}
            </p>

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
                  <Phone className="size-3.5 text-teal-600" /> Audio
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
                  <Video className="size-3.5 text-teal-600" /> Video
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
                  ? "border-teal-600 text-teal-700 dark:text-teal-400 font-semibold"
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
                      ? "border-teal-600 text-teal-700 dark:text-teal-400 font-semibold"
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
                      ? "border-teal-600 text-teal-700 dark:text-teal-400 font-semibold"
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
                  ? "border-teal-600 text-teal-700 dark:text-teal-400 font-semibold"
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
                          setEditGroupOpen(true);
                        }}
                      >
                        <Edit3 className="size-3.5 text-teal-600" />
                        <span>Edit Group Profile</span>
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
                          <BellOff className="size-3.5 text-amber-600" />
                          <span>Unmute Notifications</span>
                        </>
                      ) : (
                        <>
                          <Bell className="size-3.5 text-teal-600" />
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
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.name}
                            className="size-7 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className={cn(
                              "size-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0",
                              getAvatarColor(m.name)
                            )}
                          >
                            {(m.name || "M").charAt(0).toUpperCase()}
                          </div>
                        )}
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
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 font-bold"
                                : m.role === "admin"
                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300 font-semibold"
                                : m.role === "moderator"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300"
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
                  <RefreshCw className="size-4 animate-spin mx-auto mb-2 text-teal-600" />
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
                        <InfoIcon className="size-3.5 text-teal-600 flex-shrink-0" />
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
                        <FileIcon className="size-4 text-teal-600 flex-shrink-0" />
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
                        className="p-1 hover:bg-muted rounded text-teal-700"
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
                          "size-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0",
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
                    <Button size="sm" variant="outline" className="h-7 text-xs text-teal-700">
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
                      <RefreshCw className="size-4 text-white animate-spin" />
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
                      <ImageIcon className="size-3.5 text-teal-600" />
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
                        <Upload className="size-3.5 text-teal-600" />
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
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200"
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
                            "size-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0",
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
              className="bg-teal-700 hover:bg-teal-800 text-white font-sans"
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

      {/* 3. ADD MEMBER TO GROUP DIALOG */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent
          className="sm:max-w-[400px] font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans">Add Member to Group</DialogTitle>
            <DialogDescription className="font-sans">
              Select a colleague to invite into &quot;{activeGroup?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 font-sans">
            <Label className="text-xs block font-semibold">Choose Colleague</Label>
            <div className="max-h-[220px] overflow-y-auto space-y-1.5 border border-border rounded-md p-2">
              {contacts
                .filter(
                  (c) =>
                    !activeGroup?.members?.some(
                      (m) => m.userId === (c.userId || c.id) || m.id === c.id
                    )
                )
                .map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedAddMemberId(contact.userId || contact.id)}
                    className={cn(
                      "p-2 rounded flex items-center justify-between cursor-pointer text-xs transition-colors",
                      selectedAddMemberId === (contact.userId || contact.id)
                        ? "bg-teal-50 dark:bg-teal-950/60 font-semibold text-teal-800 dark:text-teal-200 border border-teal-200"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white",
                          contact.avatarColor
                        )}
                      >
                        {contact.avatarLetter}
                      </div>
                      <div>
                        <p className="font-semibold text-xs">{contact.name}</p>
                        <p className="text-[10px] text-muted-foreground">{contact.department}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter className="font-sans">
            <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-teal-700 hover:bg-teal-800 text-white font-sans"
              disabled={!selectedAddMemberId || addGroupMemberMutation.isPending}
              onClick={() => {
                if (activeGroup && selectedAddMemberId) {
                  addGroupMemberMutation.mutate({
                    groupId: activeGroup.id,
                    userId: selectedAddMemberId,
                  });
                }
              }}
            >
              {addGroupMemberMutation.isPending ? "Adding..." : "Add to Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. REAL INTERACTIVE WEBRTC CALL MODAL (AUDIO & VIDEO) */}
      <Dialog open={activeCallModalOpen} onOpenChange={setActiveCallModalOpen}>
        <DialogContent
          className={cn(
            "font-sans text-center",
            activeCallType === "video" ? "sm:max-w-2xl" : "sm:max-w-sm"
          )}
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <div className="py-4 flex flex-col items-center font-sans">
            {activeCallType === "video" ? (
              <div className="w-full h-80 bg-slate-950 rounded-xl relative overflow-hidden flex items-center justify-center border border-border mb-4">
                {/* Remote video element */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Local preview video in corner */}
                <div className="absolute bottom-3 right-3 w-32 h-24 bg-slate-800 rounded-lg overflow-hidden border-2 border-border shadow-md">
                  {isVideoOff ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-[10px]">
                      <VideoOff className="size-4 mb-1" /> Camera Off
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Status / Duration Overlay */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded text-xs text-white flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      callStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    )}
                  />
                  <span>
                    {callStatus === "connected"
                      ? formatDuration(callDurationSeconds)
                      : "Connecting WebRTC..."}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center mb-4">
                <audio ref={remoteAudioRef} autoPlay />
                <div
                  className={cn(
                    "size-20 rounded-full text-white flex items-center justify-center font-bold text-2xl mb-3 shadow-lg",
                    getAvatarColor(activeCallTargetName),
                    callStatus === "connected" ? "animate-none" : "animate-pulse"
                  )}
                >
                  {(activeCallTargetName || "C").charAt(0).toUpperCase()}
                </div>
                <h4 className="font-bold text-base text-foreground">{activeCallTargetName}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {callStatus === "connected" ? "WebRTC Voice Call Connected" : "Calling..."}
                </p>
                <p className="text-lg font-mono font-semibold text-teal-600 mt-2">
                  {formatDuration(callDurationSeconds)}
                </p>
              </div>
            )}

            {/* In-Call Controls */}
            <div className="flex items-center gap-4 mt-2">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
                className="rounded-full size-10 cursor-pointer"
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>

              {activeCallType === "video" && (
                <Button
                  variant={isVideoOff ? "destructive" : "outline"}
                  size="icon"
                  className="rounded-full size-10 cursor-pointer"
                  title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
                </Button>
              )}

              <Button
                variant="destructive"
                size="icon"
                className="rounded-full size-12 cursor-pointer shadow-md bg-red-600 hover:bg-red-700"
                title="Hang Up"
                onClick={handleEndCall}
              >
                <PhoneOff className="size-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. INCOMING CALL DIALOG (CALLEE) */}
      {incomingCall && (
        <Dialog open={!!incomingCall} onOpenChange={() => handleRejectIncomingCall("dismissed")}>
          <DialogContent
            className="sm:max-w-sm font-sans text-center"
            style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
          >
            <div className="py-6 flex flex-col items-center font-sans space-y-3">
              <div className="size-20 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-3xl shadow-xl animate-bounce">
                {incomingCall.callerName.charAt(0).toUpperCase()}
              </div>

              <div>
                <h3 className="font-bold text-lg text-foreground">{incomingCall.callerName}</h3>
                <p className="text-xs text-teal-600 font-semibold animate-pulse mt-0.5">
                  Incoming {incomingCall.type === "video" ? "Video" : "Audio"} Call...
                </p>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <Button
                  variant="destructive"
                  size="icon"
                  className="rounded-full size-14 shadow-lg bg-red-600 hover:bg-red-700"
                  onClick={() => handleRejectIncomingCall("declined")}
                  title="Decline"
                >
                  <PhoneOff className="size-6" />
                </Button>

                <Button
                  size="icon"
                  className="rounded-full size-14 shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleAcceptIncomingCall}
                  title="Accept"
                >
                  <Phone className="size-6" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. CREATE POLL DIALOG */}
      <Dialog open={createPollOpen} onOpenChange={setCreatePollOpen}>
        <DialogContent
          className="sm:max-w-md font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans flex items-center gap-2">
              <BarChart2 className="size-4 text-teal-600" /> Create a Poll
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
              className="bg-teal-700 hover:bg-teal-800 text-white font-sans"
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
              className="bg-teal-700 hover:bg-teal-800 text-white font-sans"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. FORWARD MESSAGE DIALOG */}
      <Dialog open={!!forwardMessage} onOpenChange={() => setForwardMessage(null)}>
        <DialogContent
          className="sm:max-w-md font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans">Forward Message</DialogTitle>
            <DialogDescription className="font-sans">
              Choose a recipient or group conversation to forward this message to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label className="text-xs font-semibold">Select Target Thread</Label>
            <div className="max-h-56 overflow-y-auto space-y-1 border rounded p-1">
              {conversations.map((c) => (
                <div
                  key={c.threadId}
                  onClick={() => setForwardTargetThreadId(c.threadId)}
                  className={cn(
                    "p-2 rounded cursor-pointer text-xs flex items-center justify-between",
                    forwardTargetThreadId === c.threadId
                      ? "bg-teal-50 dark:bg-teal-950/60 font-semibold text-teal-800 border border-teal-200"
                      : "hover:bg-muted"
                  )}
                >
                  <span>{c.title}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{c.type}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="font-sans">
            <Button variant="outline" size="sm" onClick={() => setForwardMessage(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!forwardTargetThreadId}
              onClick={handleForwardMessage}
              className="bg-teal-700 hover:bg-teal-800 text-white font-sans"
            >
              Forward Now
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
                    <ImageIcon className="size-4 text-teal-600 flex-shrink-0" />
                  ) : isPdf ? (
                    <FileText className="size-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <FileIcon className="size-4 text-blue-500 flex-shrink-0" />
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
                    <div className="size-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
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
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors"
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
                <div className="size-16 rounded-full mx-auto overflow-hidden bg-muted border-2 border-primary/20 flex items-center justify-center font-bold text-xl text-white bg-teal-700">
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
                    className="size-9 rounded-full hover:bg-teal-50 hover:text-teal-700"
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
                    className="size-9 rounded-full hover:bg-teal-50 hover:text-teal-700"
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
                  <span className="font-mono text-teal-600 font-bold">
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
              <CalendarPlus className="size-4 text-teal-600" /> Schedule Meeting
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
                            <span className="size-5 rounded-full bg-teal-600 text-white text-[9px] flex items-center justify-center font-bold">
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
              className="bg-teal-700 hover:bg-teal-800 text-white font-sans gap-1.5"
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

      {/* 12. EDIT GROUP PROFILE MODAL */}
      <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
        <DialogContent
          className="sm:max-w-md font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-sans">Edit Group Profile</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Update group display name, description, and avatar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs font-sans">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Group Name</Label>
              <Input
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                placeholder="e.g. Engineering Leadership"
                className="text-xs font-sans"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                value={editGroupDescription}
                onChange={(e) => setEditGroupDescription(e.target.value)}
                placeholder="Team sprint coordination & announcements"
                className="text-xs font-sans"
              />
            </div>

            {/* Group Avatar Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Group Avatar</Label>
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-full border border-border/80 bg-muted/40 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs relative">
                  {editGroupAvatarUrl ? (
                    <img
                      src={editGroupAvatarUrl}
                      alt="Group Avatar"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Users className="size-6 text-muted-foreground/60" />
                  )}
                  {isUploadingGroupAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <RefreshCw className="size-4 text-white animate-spin" />
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
                        setMediaPickerPurpose("editGroup");
                        setMediaPickerOpen(true);
                      }}
                    >
                      <ImageIcon className="size-3.5 text-teal-600" />
                      Choose from Media Library
                    </Button>
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
                      <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-input bg-background hover:bg-accent text-xs font-medium cursor-pointer shadow-xs">
                        <Upload className="size-3.5 text-teal-600" />
                        Upload
                      </span>
                    </label>
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
                  <span className="text-[11px] text-muted-foreground">
                    Select an existing image from Media Library or upload a new one to Chat/Images.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="font-sans">
            <Button variant="outline" size="sm" onClick={() => setEditGroupOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!editGroupName.trim() || updateGroupMutation.isPending}
              onClick={() => {
                if (!activeGroupId) return;
                updateGroupMutation.mutate({
                  groupId: activeGroupId,
                  name: editGroupName.trim(),
                  description: editGroupDescription.trim(),
                  avatarUrl: editGroupAvatarUrl.trim() || undefined,
                });
              }}
              className="bg-teal-700 hover:bg-teal-800 text-white font-sans"
            >
              Save Profile
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
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-amber-900 dark:text-amber-200 text-xs">
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
              className="bg-amber-600 hover:bg-amber-700 text-white font-sans"
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
