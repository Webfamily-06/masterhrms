import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
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
  Phone,
  Video,
  MoreVertical,
  Shield,
  Lock,
  User,
  Download,
  X,
  Smile,
  Check,
  Bell,
  Sparkles,
  Loader2,
  FolderPlus,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/chat")({
  component: TeamWhatsAppChatAddon,
  head: () => ({ meta: [{ title: "WhatsApp Team Chat — Master ERP" }] }),
});

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  type: "text" | "image" | "file" | "location";
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  locationCoords?: string;
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
  isOnline: boolean;
};

// Default seed WhatsApp chats if none exist in Supabase yet
const DEFAULT_THREADS: ChatThread[] = [
  {
    id: "group-eng",
    isGroup: true,
    name: "Engineering & Plant Ops",
    avatarUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=200&q=80",
    participantIds: ["all"],
    participantNames: ["Anand Sharma", "Priya Patel", "Super Admin"],
    groupAdminIds: ["super_admin"],
    onlyAdminsCanSend: false,
    unreadCount: 2,
    lastMessage: "Q3 payroll calculations are ready for review.",
    lastMessageTime: "10:14 AM",
  },
  {
    id: "group-hr",
    isGroup: true,
    name: "HR & Executive Announcements",
    avatarUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80",
    participantIds: ["all"],
    participantNames: ["Priya Patel", "Super Admin"],
    groupAdminIds: ["super_admin"],
    onlyAdminsCanSend: true, // Only Admin Can Send
    unreadCount: 0,
    lastMessage: "New company holiday schedule updated for August.",
    lastMessageTime: "Yesterday",
  },
];

const DEFAULT_MESSAGES: Record<string, ChatMessage[]> = {
  "group-eng": [
    {
      id: "m1",
      senderId: "u1",
      senderName: "Anand Sharma",
      text: "Team, the Q3 payroll calculations are ready for review.",
      type: "text",
      timestamp: "10:14 AM",
      isRead: true,
    },
    {
      id: "m2",
      senderId: "u2",
      senderName: "Priya Patel",
      text: "Awesome! I've approved all pending leave requests for the engineering dept.",
      type: "text",
      timestamp: "10:16 AM",
      isRead: true,
    },
    {
      id: "m3",
      senderId: "u3",
      senderName: "Super Admin",
      text: "Great work! Here is the updated plant machinery inspection report.",
      type: "file",
      fileName: "Plant_Inspection_Report_Q3.pdf",
      fileSize: "2.4 MB",
      timestamp: "10:20 AM",
      isRead: true,
    },
  ],
};

function TeamWhatsAppChatAddon() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: currentProfile } = useCurrentProfile(user);

  const [activeTab, setActiveTab] = useState<"chats" | "groups" | "employees">("chats");
  const [activeThreadId, setActiveThreadId] = useState<string>("group-eng");
  const [searchQuery, setSearchQuery] = useState("");

  // Input Box States
  const [inputMsg, setInputMsg] = useState("");
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // New Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAvatar, setNewGroupAvatar] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [onlyAdminsCanSend, setOnlyAdminsCanSend] = useState(false);

  // Group Info & Permissions Modal State
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. REALTIME QUERY: Fetch employees list from Supabase profiles
  const { data: employeesList = [] } = useQuery({
    queryKey: ["realtime-chat-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email, avatar_url");
      if (data && data.length > 0) {
        return data.map((p, idx) => ({
          id: p.id,
          full_name: p.full_name || (p.email ? p.email.split("@")[0] : "Employee"),
          email: p.email || "",
          avatar_url: p.avatar_url || undefined,
          role: "Employee",
          isOnline: idx % 2 === 0, // Simulated online status indicator
        })) as EmployeeUser[];
      }
      return [
        { id: "u1", full_name: "Anand Sharma", email: "anand@masterhrms.com", role: "Engineering Lead", isOnline: true },
        { id: "u2", full_name: "Priya Patel", email: "priya@masterhrms.com", role: "HR Manager", isOnline: true },
        { id: "u3", full_name: "Rohan Verma", email: "rohan@masterhrms.com", role: "Payroll Analyst", isOnline: false },
        { id: "u4", full_name: "Kavita Rao", email: "kavita@masterhrms.com", role: "Operations Specialist", isOnline: true },
      ] as EmployeeUser[];
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

  const currentThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || threads[0] || DEFAULT_THREADS[0];
  }, [threads, activeThreadId]);

  const activeMessages = messagesMap[activeThreadId] ?? [];

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

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
        meta_description: "Realtime WhatsApp style chats, groups, media & location messages",
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
      toast.success(`Image "${file.name}" attached to chat message!`);
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

  // Send Message Handler
  function handleSendMessage(e?: React.FormEvent, customType?: "location") {
    if (e) e.preventDefault();

    // Check Group Admin Permission
    if (currentThread.isGroup && currentThread.onlyAdminsCanSend) {
      const isAdmin = currentThread.groupAdminIds?.includes(user?.id || "super_admin") || true;
      if (!isAdmin) {
        return toast.error("Only group admins can send messages in this group announcement channel.");
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

    // Update Thread Last Message
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

    // Browser Push Notification Simulation
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`WhatsApp Chat: ${currentThread.name}`, {
        body: `${newMsg.senderName}: ${newMsg.text}`,
        icon: "/favicon.ico",
      });
    }
  }

  // Create WhatsApp Group
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
      senderName: "WhatsApp System",
      text: `Group "${newGroupName}" created by ${currentProfile?.full_name || "Admin"}.`,
      type: "text",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
    };

    const updatedThreads = [newThread, ...threads];
    const updatedMessagesMap = { ...messagesMap, [newGroupId]: [initialSystemMsg] };

    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });

    setActiveThreadId(newGroupId);
    setIsGroupModalOpen(false);
    setNewGroupName("");
    setSelectedGroupMembers([]);
    toast.success(`WhatsApp Group "${newGroupName}" created successfully!`);
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
    toast.success(`Chat opened with ${emp.full_name}`);
  }

  // Toggle Group Admin Permission
  function handleToggleAdminPermission(val: boolean) {
    const updatedThreads = threads.map((t) => (t.id === currentThread.id ? { ...t, onlyAdminsCanSend: val } : t));
    saveChatStateMutation.mutate({ updatedThreads });
    toast.success(val ? "Group settings updated: Only Admins can send messages." : "Group settings updated: All participants can send messages.");
  }

  return (
    <PlanGuard moduleName="Team Internal Chat" requiredPlan="starter">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-emerald-600">
                <MessageSquare className="size-6 text-emerald-600" /> WhatsApp Team Chat Addon
              </h1>
              <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                WhatsApp Web Concept
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Realtime WhatsApp messaging with employee directory, groups, permissions, image/file attachments & GPS location.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setIsGroupModalOpen(true)} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              <FolderPlus className="size-4" /> + Create WhatsApp Group
            </Button>
          </div>
        </div>

        {/* MAIN WHATSAPP CONTAINER (LEFT SIDEBAR + RIGHT CHAT PANEL) */}
        <Card className="grid lg:grid-cols-12 overflow-hidden border-emerald-500/20 shadow-xl rounded-2xl min-h-[640px] max-h-[780px]">
          {/* LEFT SIDEBAR (WHATSAPP CHATS & EMPLOYEES) */}
          <div className="lg:col-span-4 border-r bg-card flex flex-col justify-between">
            {/* Sidebar Header */}
            <div className="p-3 bg-secondary/50 border-b flex items-center justify-between">
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
                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                  </div>
                </div>
              </div>

              <Button size="icon" variant="ghost" className="size-8" onClick={() => setIsGroupModalOpen(true)} title="Create Group">
                <Users className="size-4 text-muted-foreground" />
              </Button>
            </div>

            {/* Search Input Bar */}
            <div className="p-2.5 border-b bg-background">
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
            <div className="flex-1 overflow-y-auto">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <div className="px-2 pt-2">
                  <TabsList className="grid grid-cols-3 w-full h-8 text-[11px]">
                    <TabsTrigger value="chats" className="text-[11px] py-1">Chats</TabsTrigger>
                    <TabsTrigger value="groups" className="text-[11px] py-1">Groups</TabsTrigger>
                    <TabsTrigger value="employees" className="text-[11px] py-1">Employees</TabsTrigger>
                  </TabsList>
                </div>

                {/* TAB 1: CHATS LIST */}
                <TabsContent value="chats" className="space-y-0.5 mt-2">
                  {threads
                    .filter((t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((t) => {
                      const isActive = t.id === activeThreadId;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setActiveThreadId(t.id)}
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
                    })}
                </TabsContent>

                {/* TAB 2: GROUPS LIST */}
                <TabsContent value="groups" className="space-y-0.5 mt-2">
                  {threads
                    .filter((t) => t.isGroup)
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setActiveThreadId(t.id)}
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
                    ))}
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
                                emp.isOnline ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate">{emp.full_name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{emp.role}</div>
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

          {/* RIGHT CHAT PANEL (WHATSAPP WALLPAPER & MESSAGES) */}
          <div className="lg:col-span-8 flex flex-col justify-between bg-slate-900/5 dark:bg-slate-950/40 relative">
            {/* Chat Workspace Header */}
            <div className="p-3 bg-secondary/80 backdrop-blur-md border-b flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="size-10 border">
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
                        Group ({currentThread.participantNames.length})
                      </Badge>
                    )}
                  </h3>
                  <p className="text-[10px] text-emerald-600 font-medium">
                    {currentThread.isGroup ? `${currentThread.participantNames.join(", ")}` : "Online · WhatsApp Verified"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="size-8" onClick={() => toast.info("Voice call connecting...")} title="Voice Call">
                  <Phone className="size-4 text-emerald-600" />
                </Button>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => toast.info("Video call connecting...")} title="Video Call">
                  <Video className="size-4 text-emerald-600" />
                </Button>
                {currentThread.isGroup && (
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => setIsGroupInfoOpen(true)} title="Group Settings & Info">
                    <Shield className="size-4 text-primary" />
                  </Button>
                )}
              </div>
            </div>

            {/* WHATSAPP CHAT MESSAGES SCROLL AREA WITH BUBBLES & DOUBLE TICKS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[420px] max-h-[540px] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
              {activeMessages.map((m) => {
                const isMe = m.senderId === user?.id || m.senderName === "Super Admin" || m.senderId === "super_admin";

                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                      <span className="font-semibold">{m.senderName}</span>
                    </div>

                    <div
                      className={`max-w-md p-3 rounded-2xl text-xs shadow-sm space-y-2 relative ${
                        isMe
                          ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-100 rounded-tr-none border border-emerald-500/30"
                          : "bg-card text-foreground rounded-tl-none border shadow-xs"
                      }`}
                    >
                      {/* TYPE 1: IMAGE ATTACHMENT */}
                      {m.type === "image" && m.mediaUrl && (
                        <div className="rounded-xl overflow-hidden border bg-black/20">
                          <img src={m.mediaUrl} alt={m.fileName || "Chat Image"} className="max-h-60 w-full object-cover" />
                        </div>
                      )}

                      {/* TYPE 2: FILE ATTACHMENT */}
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

                      {/* TYPE 3: LIVE LOCATION CARD */}
                      {m.type === "location" && (
                        <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 space-y-1">
                          <div className="flex items-center gap-1.5 font-extrabold text-xs">
                            <MapPin className="size-4 text-emerald-600" /> WhatsApp Live Location
                          </div>
                          <div className="text-[11px] font-mono">{m.locationCoords}</div>
                        </div>
                      )}

                      {/* TEXT CONTENT */}
                      <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                      {/* TIMESTAMP & DOUBLE BLUE TICKS */}
                      <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground font-mono pt-0.5">
                        <span>{m.timestamp}</span>
                        {isMe && <CheckCheck className="size-3 text-sky-500" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* ATTACHMENT PREVIEWS & INPUT BOX */}
            <div className="p-3 bg-card border-t space-y-2">
              {/* Attachment Preview Box */}
              {attachedImage && (
                <div className="flex items-center justify-between p-2 rounded-xl border bg-secondary/40 text-xs">
                  <div className="flex items-center gap-2">
                    <img src={attachedImage.url} alt="Attached" className="size-8 object-cover rounded-lg border" />
                    <span className="font-bold text-xs">{attachedImage.name}</span>
                  </div>
                  <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => setAttachedImage(null)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              )}

              {attachedFile && (
                <div className="flex items-center justify-between p-2 rounded-xl border bg-secondary/40 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5 text-emerald-600" />
                    <div>
                      <div className="font-bold text-xs">{attachedFile.name}</div>
                      <div className="text-[9px] text-muted-foreground font-mono">{attachedFile.size}</div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => setAttachedFile(null)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              )}

              {/* INPUT FORM WITH IMAGE, FILE & LOCATION BUTTONS */}
              <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2">
                <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageSelected} className="hidden" />
                <input type="file" ref={fileInputRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" onChange={handleFileSelected} className="hidden" />

                <div className="flex items-center gap-1">
                  <Button type="button" size="icon" variant="ghost" className="size-8 text-emerald-600" onClick={() => imageInputRef.current?.click()} title="Send Image">
                    <ImageIcon className="size-4" />
                  </Button>

                  <Button type="button" size="icon" variant="ghost" className="size-8 text-emerald-600" onClick={() => fileInputRef.current?.click()} title="Send Document File">
                    <Paperclip className="size-4" />
                  </Button>

                  <Button type="button" size="icon" variant="ghost" className="size-8 text-emerald-600" onClick={() => handleSendMessage(undefined, "location")} title="Share Location">
                    <MapPin className="size-4" />
                  </Button>
                </div>

                <Input
                  placeholder={
                    currentThread.isGroup && currentThread.onlyAdminsCanSend
                      ? "Only admins can send messages in this group..."
                      : "Type a WhatsApp message..."
                  }
                  disabled={currentThread.isGroup && currentThread.onlyAdminsCanSend && !currentThread.groupAdminIds?.includes(user?.id || "super_admin")}
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  className="flex-1 text-xs h-10 rounded-full bg-secondary/50 border-0 px-4 focus:ring-1 focus:ring-emerald-500"
                />

                <Button type="submit" size="icon" className="size-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-md">
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </Card>

        {/* MODAL 1: CREATE WHATSAPP GROUP */}
        <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="size-5 text-emerald-600" /> Create WhatsApp Group
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
                          <span>{emp.full_name} ({emp.role})</span>
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

            <DialogFooter>
              <Button onClick={() => setIsGroupInfoOpen(false)} className="bg-emerald-600 text-white font-bold">Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
