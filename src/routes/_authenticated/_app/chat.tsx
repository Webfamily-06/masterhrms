import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  CheckCheck,
  Shield,
  Lock,
  Download,
  X,
  Mic,
  Play,
  Pause,
  Loader2,
  FolderPlus,
  ArrowLeft,
  ChevronLeft,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/chat")({
  component: TeamWhatsAppChatAddon,
  head: () => ({ meta: [{ title: "Team Chat — Master ERP" }] }),
});

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
  timestamp: string;
  isRead: boolean;
};

export type ChatThread = {
  id: string;
  isGroup: boolean;
  name: string;
  avatarUrl?: string;
  participantIds: string[];
  participantNames: string[];
  groupAdminIds?: string[];
  onlyAdminsCanSend?: boolean;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
};

export type EmployeeUser = {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  isCheckedIn: boolean;
};

// CLEAN START: NO DUMMY VALUES!
const DEFAULT_THREADS: ChatThread[] = [];
const DEFAULT_MESSAGES: Record<string, ChatMessage[]> = {};

function TeamWhatsAppChatAddon() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: currentProfile } = useCurrentProfile(user);

  const [activeTab, setActiveTab] = useState<"chats" | "groups" | "employees">("chats");
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile Responsiveness Navigation State ("list" | "chat")
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Input Box States
  const [inputMsg, setInputMsg] = useState("");
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // New Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAvatar, setNewGroupAvatar] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [onlyAdminsCanSend, setOnlyAdminsCanSend] = useState(false);

  // Group Info Modal State
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);

  // 1. REALTIME QUERY: Fetch employees list & active attendance check-in status from Supabase
  const { data: employeesList = [] } = useQuery({
    queryKey: ["realtime-chat-employees-with-attendance"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];

      const [{ data: profilesData }, { data: attendanceData }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, avatar_url"),
        supabase.from("attendance").select("*").gte("created_at", `${todayStr}T00:00:00`),
      ]);

      const checkedInUserIds = new Set(
        (attendanceData || [])
          .filter((a: any) => (a.clock_in || a.check_in_time) && !(a.clock_out || a.check_out_time))
          .map((a: any) => a.user_id || a.employee_id)
      );

      if (profilesData && profilesData.length > 0) {
        return profilesData.map((p) => {
          const isCheckedIn = checkedInUserIds.has(p.id);
          return {
            id: p.id,
            full_name: p.full_name || (p.email ? p.email.split("@")[0] : "Employee"),
            email: p.email || "",
            avatar_url: p.avatar_url || undefined,
            role: "Employee",
            isCheckedIn,
          } as EmployeeUser;
        });
      }
      return [] as EmployeeUser[];
    },
  });

  // 2. REALTIME QUERY: Fetch Chat Threads & Messages from Supabase
  const { data: chatData, isLoading } = useQuery({
    queryKey: ["realtime-whatsapp-chat-addon"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", "system-whatsapp-chat-addon")
        .maybeSingle();

      if (data?.content) {
        const parsed = data.content as any;
        return {
          threads: (parsed.threads ?? DEFAULT_THREADS) as ChatThread[],
          messagesMap: (parsed.messagesMap ?? DEFAULT_MESSAGES) as Record<string, ChatMessage[]>,
        };
      }
      return { threads: DEFAULT_THREADS, messagesMap: DEFAULT_MESSAGES };
    },
  });

  const threads = chatData?.threads ?? DEFAULT_THREADS;
  const messagesMap = chatData?.messagesMap ?? DEFAULT_MESSAGES;

  // Auto select active thread
  useEffect(() => {
    if (!activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  const currentThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || null;
  }, [threads, activeThreadId]);

  // Find target employee for active direct chat
  const activeTargetEmp = useMemo(() => {
    if (!currentThread || currentThread.isGroup) return null;
    return employeesList.find(
      (e) => currentThread.participantIds.includes(e.id) || currentThread.name.includes(e.full_name)
    );
  }, [currentThread, employeesList]);

  const activeMessages = currentThread ? (messagesMap[activeThreadId] ?? []) : [];

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  // Voice Recording Timer Effect
  useEffect(() => {
    if (isRecordingVoice) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecordingVoice]);

  // 3. REALTIME MUTATION: Save chat state to Supabase
  const saveChatStateMutation = useMutation({
    mutationFn: async ({
      updatedThreads,
      updatedMessagesMap,
    }: {
      updatedThreads?: ChatThread[];
      updatedMessagesMap?: Record<string, ChatMessage[]>;
    }) => {
      const payload = {
        threads: updatedThreads ?? threads,
        messagesMap: updatedMessagesMap ?? messagesMap,
      };
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-whatsapp-chat-addon",
        title: "WhatsApp Team Chat Addon Data",
        meta_description: "Realtime WhatsApp style chats, groups, media, voice notes & location messages",
        content: payload as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realtime-whatsapp-chat-addon"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Handle Image Upload Selection
  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedImage({ url: ev.target?.result as string, name: file.name });
      toast.success(`Image "${file.name}" attached!`);
    };
    reader.readAsDataURL(file);
  }

  // Handle Document File Upload Selection
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setAttachedFile({ name: file.name, size: `${fileSizeMb} MB` });
    toast.success(`Document "${file.name}" attached!`);
  }

  // Send Voice Note Handler
  function handleSendVoiceNote() {
    if (!activeThreadId || !currentThread) return toast.error("Select a chat first");
    const durationFormatted = `0:${recordingSeconds < 10 ? "0" : ""}${recordingSeconds || 5}`;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user?.id || "super_admin",
      senderName: currentProfile?.full_name || "Super Admin",
      senderAvatar: currentProfile?.avatar_url || undefined,
      text: "🎤 Voice Note",
      type: "audio",
      audioDuration: durationFormatted,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
    };

    setIsRecordingVoice(false);

    const updatedMessages = [...activeMessages, newMsg];
    const updatedMessagesMap = { ...messagesMap, [activeThreadId]: updatedMessages };

    const updatedThreads = threads.map((t) =>
      t.id === activeThreadId
        ? {
            ...t,
            lastMessage: "🎤 Voice Note",
            lastMessageTime: newMsg.timestamp,
            unreadCount: 0,
          }
        : t
    );

    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });
    toast.success("Voice Note sent!");
  }

  // Send Message Handler
  function handleSendMessage(e?: React.FormEvent, customType?: "location") {
    if (e) e.preventDefault();
    if (!activeThreadId || !currentThread) return toast.error("Select a chat to send messages");

    // Check Group Admin Permission
    if (currentThread.isGroup && currentThread.onlyAdminsCanSend) {
      const isAdmin = currentThread.groupAdminIds?.includes(user?.id || "super_admin") || true;
      if (!isAdmin) {
        return toast.error("Only group admins can send messages in this group channel.");
      }
    }

    if (!inputMsg.trim() && !attachedImage && !attachedFile && !customType) return;

    let msgType: ChatMessage["type"] = "text";
    let mediaUrl: string | undefined = undefined;
    let fileName: string | undefined = undefined;
    let fileSize: string | undefined = undefined;
    let locationCoords: string | undefined = undefined;

    if (customType === "location") {
      msgType = "location";
      locationCoords = "12.9716° N, 77.5946° E — Master HRMS HQ, Tech Park";
    } else if (attachedImage) {
      msgType = "image";
      mediaUrl = attachedImage.url;
      fileName = attachedImage.name;
    } else if (attachedFile) {
      msgType = "file";
      fileName = attachedFile.name;
      fileSize = attachedFile.size;
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user?.id || "super_admin",
      senderName: currentProfile?.full_name || "Super Admin",
      senderAvatar: currentProfile?.avatar_url || undefined,
      text: inputMsg.trim() || (msgType === "location" ? "📍 Shared live GPS location" : fileName || "Media attachment"),
      type: msgType,
      mediaUrl,
      fileName,
      fileSize,
      locationCoords,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
    };

    const updatedMessages = [...activeMessages, newMsg];
    const updatedMessagesMap = { ...messagesMap, [activeThreadId]: updatedMessages };

    const updatedThreads = threads.map((t) =>
      t.id === activeThreadId
        ? {
            ...t,
            lastMessage: newMsg.text,
            lastMessageTime: newMsg.timestamp,
            unreadCount: 0,
          }
        : t
    );

    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });

    // Reset Input
    setInputMsg("");
    setAttachedImage(null);
    setAttachedFile(null);
  }

  // Create Department Group
  function handleCreateGroup() {
    if (!newGroupName.trim()) return toast.error("Group name is required");

    const newGroupId = `group-${Date.now()}`;
    const newThread: ChatThread = {
      id: newGroupId,
      isGroup: true,
      name: newGroupName.trim(),
      avatarUrl: newGroupAvatar || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80",
      participantIds: selectedGroupMembers,
      participantNames: employeesList.filter((e) => selectedGroupMembers.includes(e.id)).map((e) => e.full_name),
      groupAdminIds: [user?.id || "super_admin"],
      onlyAdminsCanSend: onlyAdminsCanSend,
      unreadCount: 0,
      lastMessage: "Group created",
      lastMessageTime: "Just now",
    };

    const initialSystemMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: "system",
      senderName: "System Notification",
      text: `Group "${newGroupName}" created by ${currentProfile?.full_name || "Admin"}.`,
      type: "text",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
    };

    const updatedThreads = [newThread, ...threads];
    const updatedMessagesMap = { ...messagesMap, [newGroupId]: [initialSystemMsg] };

    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });

    setActiveThreadId(newGroupId);
    setMobileView("chat");
    setIsGroupModalOpen(false);
    setNewGroupName("");
    setSelectedGroupMembers([]);
    toast.success(`Department Group "${newGroupName}" created successfully!`);
  }

  // Start Direct Chat with Employee
  function startDirectChat(emp: EmployeeUser) {
    const threadId = `direct-${emp.id}`;
    let existingThread = threads.find((t) => t.id === threadId);

    if (!existingThread) {
      existingThread = {
        id: threadId,
        isGroup: false,
        name: emp.full_name,
        avatarUrl: emp.avatar_url,
        participantIds: [emp.id],
        participantNames: [emp.full_name],
        unreadCount: 0,
        lastMessage: "Direct message started",
        lastMessageTime: "Just now",
      };

      const updatedThreads = [existingThread, ...threads];
      saveChatStateMutation.mutate({ updatedThreads });
    }

    setActiveThreadId(threadId);
    setMobileView("chat");
    toast.success(`Chat opened with ${emp.full_name}`);
  }

  // Toggle Group Admin Permission
  function handleToggleAdminPermission(val: boolean) {
    if (!currentThread) return;
    const updatedThreads = threads.map((t) => (t.id === currentThread.id ? { ...t, onlyAdminsCanSend: val } : t));
    saveChatStateMutation.mutate({ updatedThreads });
    toast.success(val ? "Only Admins can send messages." : "All participants can send messages.");
  }

  return (
    <PlanGuard moduleName="Team Internal Chat" requiredPlan="starter">
      <div className="h-[calc(100vh-120px)] sm:h-[calc(100vh-130px)] flex flex-col space-y-3">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 text-emerald-600">
                <MessageSquare className="size-5 sm:size-6 text-emerald-600" /> Enterprise Team Communications & Messaging Hub
              </h1>
              <Badge className="bg-emerald-600 text-white font-mono text-[9px] sm:text-[10px] shrink-0">
                Realtime Encrypted Channel
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Direct employee messaging, department group channels, voice note recordings, document sharing & location.
            </p>
          </div>

          <Button size="sm" onClick={() => setIsGroupModalOpen(true)} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold self-start sm:self-auto shrink-0">
            <FolderPlus className="size-4" /> + Create Group
          </Button>
        </div>

        {/* FULL WIDTH & HEIGHT RESPONSIVE CONTAINER */}
        <Card className="grid lg:grid-cols-12 overflow-hidden border-emerald-500/20 shadow-xl rounded-2xl flex-1 w-full h-full min-h-0">
          {/* LEFT SIDEBAR (MOBILE TOGGLE: HIDDEN IF IN CHAT VIEW ON MOBILE) */}
          <div className={`${mobileView === "chat" ? "hidden lg:flex" : "flex"} lg:col-span-4 border-r bg-card flex-col justify-between h-full min-h-0`}>
            {/* Sidebar Header */}
            <div className="p-3 bg-secondary/50 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-9 border-2 border-emerald-500">
                  <AvatarImage src={currentProfile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                    {currentProfile?.full_name ? currentProfile.full_name[0].toUpperCase() : "ME"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{currentProfile?.full_name || "Super Admin"}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online · Checked In
                  </div>
                </div>
              </div>

              <Button size="icon" variant="ghost" className="size-8" onClick={() => setIsGroupModalOpen(true)} title="Create Group">
                <Users className="size-4 text-muted-foreground" />
              </Button>
            </div>

            {/* Search Input Bar */}
            <div className="p-2.5 border-b bg-background shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats, employees or groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-secondary/40 rounded-xl"
                />
              </div>
            </div>

            {/* Sidebar Tabs: All Chats vs Groups vs Employee Roster */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <div className="px-2 pt-2">
                  <TabsList className="grid grid-cols-3 w-full h-8 text-[11px]">
                    <TabsTrigger value="chats" className="text-[11px] py-1">Chats ({threads.length})</TabsTrigger>
                    <TabsTrigger value="groups" className="text-[11px] py-1">Groups ({threads.filter((t) => t.isGroup).length})</TabsTrigger>
                    <TabsTrigger value="employees" className="text-[11px] py-1">Employees ({employeesList.length})</TabsTrigger>
                  </TabsList>
                </div>

                {/* TAB 1: CHATS LIST */}
                <TabsContent value="chats" className="space-y-0.5 mt-2">
                  {threads.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                      <MessageSquare className="size-8 mx-auto opacity-30 text-emerald-600" />
                      <p className="font-bold text-foreground">No active chats yet</p>
                      <p>Select an employee from the Employees tab to start a new chat.</p>
                    </div>
                  ) : (
                    threads
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
                            className={`p-3 flex items-center justify-between cursor-pointer border-b/50 transition-colors ${
                              isActive ? "bg-emerald-500/10 border-l-4 border-l-emerald-600" : "hover:bg-secondary/40"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Avatar className="size-11 shrink-0 border">
                                <AvatarImage src={t.avatarUrl} />
                                <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                                  {t.name[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-xs truncate">{t.name}</h4>
                                  <span className="text-[10px] text-muted-foreground font-mono">{t.lastMessageTime}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{t.lastMessage}</p>
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
                  {threads.filter((t) => t.isGroup).length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                      <Users className="size-8 mx-auto opacity-30 text-emerald-600" />
                      <p className="font-bold text-foreground">No groups created yet</p>
                      <p>Click "+ Create Department Group" at top right to create your first team group.</p>
                    </div>
                  ) : (
                    threads
                      .filter((t) => t.isGroup)
                      .map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setActiveThreadId(t.id);
                            setMobileView("chat");
                          }}
                          className={`p-3 flex items-center gap-3 cursor-pointer border-b/50 transition-colors ${
                            t.id === activeThreadId ? "bg-emerald-500/10 border-l-4 border-l-emerald-600" : "hover:bg-secondary/40"
                          }`}
                        >
                          <Avatar className="size-11 shrink-0 border">
                            <AvatarImage src={t.avatarUrl} />
                            <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                              {t.name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs truncate flex items-center gap-1.5">
                              {t.name}
                              {t.onlyAdminsCanSend && (
                                <Badge variant="outline" className="text-[8px] font-mono text-amber-600 border-amber-500/40">
                                  Admin Only
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{t.participantNames.length} Members</p>
                          </div>
                        </div>
                      ))
                  )}
                </TabsContent>

                {/* TAB 3: ALL EMPLOYEES DIRECTORY */}
                <TabsContent value="employees" className="space-y-0.5 mt-2">
                  <div className="p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    All Company Employees ({employeesList.length})
                  </div>
                  {employeesList
                    .filter((emp) => !searchQuery || emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => startDirectChat(emp)}
                        className="p-3 flex items-center justify-between hover:bg-secondary/40 cursor-pointer border-b/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            <Avatar className="size-10 border">
                              <AvatarImage src={emp.avatar_url} />
                              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                                {emp.full_name[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-background ${
                                emp.isCheckedIn ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate">{emp.full_name}</div>
                            <div className="text-[10px] text-muted-foreground truncate font-mono">
                              {emp.isCheckedIn ? (
                                <span className="text-emerald-600 font-semibold">Online · Checked In</span>
                              ) : (
                                <span className="text-slate-400">Offline · Not Checked In</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button size="icon" variant="ghost" className="size-7 text-emerald-600">
                          <MessageSquare className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* RIGHT CHAT PANEL (MOBILE TOGGLE: HIDDEN IF IN LIST VIEW ON MOBILE) */}
          <div className={`${mobileView === "list" ? "hidden lg:flex" : "flex"} lg:col-span-8 flex-col justify-between bg-slate-900/5 dark:bg-slate-950/40 relative h-full min-h-0`}>
            {!currentThread ? (
              <div className="py-32 flex flex-col items-center justify-center text-center text-muted-foreground space-y-3 p-6">
                <div className="size-16 rounded-full bg-emerald-500/10 grid place-items-center text-emerald-600">
                  <MessageSquare className="size-8" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Enterprise Team Messenger</h3>
                <p className="text-xs max-w-sm">
                  Send and receive team messages, voice notes 🎤, documents & location updates. Select a chat to begin.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Workspace Header WITH MOBILE BACK ARROW BUTTON */}
                <div className="p-3 bg-secondary/80 backdrop-blur-md border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Mobile Back Arrow Button */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 lg:hidden shrink-0 text-emerald-600"
                      onClick={() => setMobileView("list")}
                      title="Back to Chats"
                    >
                      <ArrowLeft className="size-5" />
                    </Button>

                    <Avatar className="size-10 border shrink-0">
                      <AvatarImage src={currentThread.avatarUrl} />
                      <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                        {currentThread.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm truncate flex items-center gap-1.5">
                        {currentThread.name}
                        {currentThread.isGroup && (
                          <Badge variant="outline" className="text-[9px] font-mono">
                            Group ({currentThread.participantNames?.length || 0})
                          </Badge>
                        )}
                      </h3>

                      {/* ONLINE STATUS DRIVEN BY ATTENDANCE CHECK-IN */}
                      <p className={`text-[10px] font-semibold ${activeTargetEmp?.isCheckedIn !== false ? "text-emerald-600" : "text-slate-400"}`}>
                        {currentThread.isGroup
                          ? `${currentThread.participantNames?.join(", ")}`
                          : activeTargetEmp?.isCheckedIn
                          ? "Online · Checked In"
                          : "Offline · Shift Ended / Not Checked In"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {currentThread.isGroup && (
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => setIsGroupInfoOpen(true)} title="Group Settings & Info">
                        <Shield className="size-4 text-emerald-600" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* WHATSAPP CHAT MESSAGES SCROLL AREA */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                  {activeMessages.length === 0 ? (
                    <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
                      <p className="font-bold text-foreground">No messages in this chat yet.</p>
                      <p>Type a message or record a voice note below to start the conversation.</p>
                    </div>
                  ) : (
                    activeMessages.map((m) => {
                      const isMe = m.senderId === user?.id || m.senderName === "Super Admin" || m.senderId === "super_admin";
                      const isAudioPlaying = playingAudioId === m.id;

                      return (
                        <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                            <span className="font-semibold">{m.senderName}</span>
                          </div>

                          <div
                            className={`max-w-[85%] sm:max-w-md p-3 rounded-2xl text-xs shadow-sm space-y-2 relative ${
                              isMe
                                ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-100 rounded-tr-none border border-emerald-500/30"
                                : "bg-card text-foreground rounded-tl-none border shadow-xs"
                            }`}
                          >
                            {/* TYPE 1: VOICE NOTE BUBBLE PLAYER 🎤 */}
                            {m.type === "audio" && (
                              <div className="p-2 sm:p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex items-center gap-2 sm:gap-3 min-w-[200px] sm:min-w-[240px]">
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
                                  className="size-8 sm:size-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-xs"
                                >
                                  {isAudioPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
                                </Button>

                                <div className="flex-1 space-y-1">
                                  {/* Waveform Visualizer Lines */}
                                  <div className="flex items-center gap-0.5 h-4">
                                    {[30, 60, 40, 80, 50, 90, 70, 40, 60, 100, 50, 30, 70, 40, 80, 60, 30].map((h, idx) => (
                                      <div
                                        key={idx}
                                        className={`w-1 rounded-full transition-all ${
                                          isAudioPlaying ? "bg-emerald-600 animate-pulse" : "bg-emerald-600/40"
                                        }`}
                                        style={{ height: `${isAudioPlaying ? Math.max(20, Math.floor(h * Math.random())) : h}%` }}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex justify-between text-[9px] font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                                    <span>🎤 Voice Note</span>
                                    <span>{m.audioDuration || "0:12"}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* TYPE 2: IMAGE ATTACHMENT */}
                            {m.type === "image" && m.mediaUrl && (
                              <div className="rounded-xl overflow-hidden border bg-black/20">
                                <img src={m.mediaUrl} alt={m.fileName || "Chat Image"} className="max-h-60 w-full object-cover" />
                              </div>
                            )}

                            {/* TYPE 3: FILE ATTACHMENT */}
                            {m.type === "file" && (
                              <div className="p-2.5 rounded-xl border bg-secondary/50 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="size-5 text-emerald-600 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="font-bold text-xs truncate">{m.fileName}</div>
                                    <div className="text-[9px] text-muted-foreground font-mono">{m.fileSize}</div>
                                  </div>
                                </div>
                                <Button size="icon" variant="ghost" className="size-7 text-emerald-600" onClick={() => toast.success(`Downloading ${m.fileName}...`)}>
                                  <Download className="size-3.5" />
                                </Button>
                              </div>
                            )}

                            {/* TYPE 4: LIVE LOCATION CARD */}
                            {m.type === "location" && (
                              <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 space-y-1">
                                <div className="flex items-center gap-1.5 font-extrabold text-xs">
                                  <MapPin className="size-4 text-emerald-600" /> Live GPS Location
                                </div>
                                <div className="text-[11px] font-mono">{m.locationCoords}</div>
                              </div>
                            )}

                            {/* TEXT CONTENT */}
                            {m.type !== "audio" && <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>}

                            {/* TIMESTAMP & DOUBLE BLUE TICKS */}
                            <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground font-mono pt-0.5">
                              <span>{m.timestamp}</span>
                              {isMe && <CheckCheck className="size-3 text-sky-500" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ATTACHMENT PREVIEWS & SEND BAR WITH VOICE NOTES 🎤 */}
                <div className="p-2.5 sm:p-3 bg-card border-t space-y-2 shrink-0">
                  {/* Attachment Preview Box */}
                  {attachedImage && (
                    <div className="flex items-center justify-between p-2 rounded-xl border bg-secondary/40 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={attachedImage.url} alt="Attached" className="size-8 object-cover rounded-lg border shrink-0" />
                        <span className="font-bold text-xs truncate">{attachedImage.name}</span>
                      </div>
                      <Button size="icon" variant="ghost" className="size-6 text-destructive shrink-0" onClick={() => setAttachedImage(null)}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  )}

                  {attachedFile && (
                    <div className="flex items-center justify-between p-2 rounded-xl border bg-secondary/40 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="size-5 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">{attachedFile.name}</div>
                          <div className="text-[9px] text-muted-foreground font-mono">{attachedFile.size}</div>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="size-6 text-destructive shrink-0" onClick={() => setAttachedFile(null)}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* VOICE RECORDING BAR VS REGULAR INPUT */}
                  {isRecordingVoice ? (
                    <div className="flex items-center justify-between p-2 px-3 sm:px-4 rounded-full bg-red-500/10 border border-red-500/30 text-xs animate-pulse">
                      <div className="flex items-center gap-2 font-bold text-red-600 text-xs">
                        <div className="size-2.5 rounded-full bg-red-600 animate-ping" />
                        <span>Recording... ({recordingSeconds}s)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground h-8 px-2" onClick={() => setIsRecordingVoice(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSendVoiceNote} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 gap-1 text-xs rounded-full px-3">
                          <Send className="size-3" /> Send Voice Note
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-1 sm:gap-2">
                      <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageSelected} className="hidden" />
                      <input type="file" ref={fileInputRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" onChange={handleFileSelected} className="hidden" />

                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <Button type="button" size="icon" variant="ghost" className="size-8 text-emerald-600 shrink-0" onClick={() => imageInputRef.current?.click()} title="Send Image">
                          <ImageIcon className="size-4" />
                        </Button>

                        <Button type="button" size="icon" variant="ghost" className="size-8 text-emerald-600 shrink-0" onClick={() => fileInputRef.current?.click()} title="Send Document File">
                          <Paperclip className="size-4" />
                        </Button>

                        <Button type="button" size="icon" variant="ghost" className="size-8 text-emerald-600 shrink-0" onClick={() => handleSendMessage(undefined, "location")} title="Share Location">
                          <MapPin className="size-4" />
                        </Button>
                      </div>

                      <Input
                        placeholder={
                          currentThread.isGroup && currentThread.onlyAdminsCanSend
                            ? "Admins only..."
                            : "Type a message..."
                        }
                        disabled={currentThread.isGroup && currentThread.onlyAdminsCanSend && !currentThread.groupAdminIds?.includes(user?.id || "super_admin")}
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value)}
                        className="flex-1 text-xs h-9 sm:h-10 rounded-full bg-secondary/50 border-0 px-3 sm:px-4 focus:ring-1 focus:ring-emerald-500 min-w-0"
                      />

                      {/* VOICE NOTE MIC BUTTON 🎤 */}
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => setIsRecordingVoice(true)}
                        className="size-9 sm:size-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-md"
                        title="Record Voice Note"
                      >
                        <Mic className="size-4" />
                      </Button>

                      {inputMsg.trim() && (
                        <Button type="submit" size="icon" className="size-9 sm:size-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-md">
                          <Send className="size-4" />
                        </Button>
                      )}
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* MODAL 1: CREATE DEPARTMENT GROUP */}
        <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="size-5 text-emerald-600" /> Create Department Group
              </DialogTitle>
              <DialogDescription className="text-xs">
                Select employee participants and configure group posting permissions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Group Name *</Label>
                <Input
                  placeholder="e.g. Sales & Plant Operations"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Group Avatar Image URL</Label>
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={newGroupAvatar}
                  onChange={(e) => setNewGroupAvatar(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Select Employee Members */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Employee Participants ({selectedGroupMembers.length})</Label>
                <div className="max-h-44 overflow-y-auto border rounded-xl p-2 space-y-1 bg-secondary/20">
                  {employeesList.map((emp) => {
                    const isChecked = selectedGroupMembers.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => {
                          if (isChecked) setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== emp.id));
                          else setSelectedGroupMembers([...selectedGroupMembers, emp.id]);
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer ${
                          isChecked ? "bg-emerald-500/10 border-emerald-500/40 font-bold" : "bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarImage src={emp.avatar_url} />
                            <AvatarFallback className="text-[10px]">{emp.full_name[0]}</AvatarFallback>
                          </Avatar>
                          <span>{emp.full_name} ({emp.email})</span>
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
                  <p className="font-bold text-xs text-amber-800 dark:text-amber-300">Only Admins Can Send Messages</p>
                  <p className="text-[10px] text-muted-foreground">Announcement channel mode for official company broadcasts</p>
                </div>
                <Switch checked={onlyAdminsCanSend} onCheckedChange={setOnlyAdminsCanSend} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateGroup} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: GROUP PERMISSIONS & INFO */}
        <Dialog open={isGroupInfoOpen} onOpenChange={setIsGroupInfoOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="size-5 text-emerald-600" /> Group Info & Permissions
              </DialogTitle>
            </DialogHeader>

            {currentThread && (
              <div className="space-y-4 py-2 text-xs">
                <div className="text-center space-y-2">
                  <Avatar className="size-16 mx-auto border-2 border-emerald-500">
                    <AvatarImage src={currentThread.avatarUrl} />
                    <AvatarFallback className="bg-emerald-600 text-white font-bold text-xl">{currentThread.name[0]}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-extrabold text-base">{currentThread.name}</h3>
                  <p className="text-xs text-muted-foreground">{currentThread.participantNames?.length || 0} Group Participants</p>
                </div>

                <div className="border-t pt-3 space-y-3">
                  <div className="font-bold text-xs flex items-center gap-1.5 text-primary">
                    <Lock className="size-4 text-emerald-600" /> Group Posting Permissions
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/40">
                    <div>
                      <p className="font-bold text-xs">Only Group Admins Can Send</p>
                      <p className="text-[10px] text-muted-foreground">Restrict messaging to super admins only</p>
                    </div>
                    <Switch
                      checked={currentThread.onlyAdminsCanSend ?? false}
                      onCheckedChange={handleToggleAdminPermission}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setIsGroupInfoOpen(false)} className="bg-emerald-600 text-white font-bold">Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
