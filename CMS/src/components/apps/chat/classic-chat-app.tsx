"use client";
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Settings,
  Plus,
  Phone,
  Video,
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
  Check,
  FileText,
  Download,
  Trash2,
  Share2,
  ExternalLink,
  ChevronUp,
  X,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ChatMode = "chats" | "groups" | "contacts";

interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  types?: "sent" | "received";
  time?: string;
  createdAt?: string;
  attachments?: any;
}

interface ContactItem {
  id: string;
  name: string;
  avatarLetter: string;
  avatarColor: string;
  status: "online" | "offline" | "busy" | "away";
  statusText?: string;
  lastMessage?: string;
  time?: string;
  unread?: number;
  email?: string;
  phone?: string;
  title?: string;
  location?: string;
  bio?: string;
}

interface GroupItem {
  id: string;
  name: string;
  avatarLetter: string;
  avatarColor: string;
  memberCount: number;
  members: string[];
  lastMessage?: string;
  time?: string;
  unread?: number;
  description?: string;
  channel?: string;
}

const DEFAULT_CONTACTS: ContactItem[] = [
  {
    id: "user_1",
    name: "Report Tester",
    avatarLetter: "R",
    avatarColor: "bg-teal-700 text-white",
    status: "online",
    statusText: "Typing...",
    lastMessage: "Hey Ben, just a reminder that you are coming for the meeting today",
    time: "Now",
    title: "Co-Founder",
    email: "contact@hencework.com",
    phone: "+91-25-4125-2365",
    location: "Oslo, Canada",
    bio: "Hello there, Huma Therman is a brilliant co-founder and copywriter working for almost a decade for fortune 500 companies.",
  },
  {
    id: "user_2",
    name: "Alex Morgan",
    avatarLetter: "A",
    avatarColor: "bg-emerald-600 text-white",
    status: "online",
    statusText: "Online",
    lastMessage: "Images for new marketing pages have been sent",
    time: "10:53 PM",
    title: "Lead UI Designer",
    email: "alex.morgan@masterhrms.com",
    phone: "+1-555-019-2834",
    location: "New York, USA",
    bio: "Specializing in design systems and micro-interactions.",
  },
  {
    id: "user_3",
    name: "Alan Rickman",
    avatarLetter: "A",
    avatarColor: "bg-slate-500 text-white",
    status: "online",
    statusText: "Today I don't feel like doing anything...",
    lastMessage: "Cool, lets talk about it tomorrow",
    time: "Yesterday",
    title: "Senior Developer",
    email: "alan.rickman@masterhrms.com",
    phone: "+44-20-7946-0912",
    location: "London, UK",
    bio: "Senior systems architect and backend lead.",
  },
  {
    id: "user_4",
    name: "Ashley Jude",
    avatarLetter: "A",
    avatarColor: "bg-cyan-600 text-white",
    status: "busy",
    statusText: "Ma life ma rules",
    lastMessage: "Can we review the deployment branch?",
    time: "2 days ago",
    title: "DevOps Engineer",
    email: "ashley.jude@masterhrms.com",
    phone: "+1-555-482-1920",
    location: "Toronto, Canada",
    bio: "Infrastructure, Kubernetes & CI/CD pipeline manager.",
  },
  {
    id: "user_5",
    name: "Billy Zen",
    avatarLetter: "B",
    avatarColor: "bg-purple-600 text-white",
    status: "away",
    statusText: "Take me to the moon",
    lastMessage: "The financial statements are audited",
    time: "5 days ago",
    title: "Finance Manager",
    email: "billy.zen@masterhrms.com",
    phone: "+61-2-9384-1029",
    location: "Sydney, Australia",
    bio: "Chief financial reporting officer.",
  },
  {
    id: "user_6",
    name: "Bradley Cooper",
    avatarLetter: "B",
    avatarColor: "bg-amber-600 text-white",
    status: "online",
    statusText: "Always Busy",
    lastMessage: "Customer onboarding batch #4 is completed",
    time: "1 week ago",
    title: "Customer Success",
    email: "bradley.c@masterhrms.com",
    phone: "+1-555-920-3841",
    location: "San Francisco, USA",
    bio: "Driving enterprise adoption and retention.",
  },
];

const DEFAULT_GROUPS: GroupItem[] = [
  {
    id: "group_1",
    name: "Developers Stage",
    avatarLetter: "D",
    avatarColor: "bg-teal-700 text-white",
    memberCount: 14,
    members: ["Report Tester", "Alex Morgan", "Alan Rickman", "Ashley Jude"],
    lastMessage: "Images for new marketing pages have been sent",
    time: "10:53 PM",
    description: "Code builders & reviewers stage",
    channel: "#Developer",
  },
  {
    id: "group_2",
    name: "Designer'ss",
    avatarLetter: "D",
    avatarColor: "bg-indigo-600 text-white",
    memberCount: 8,
    members: ["Alex Morgan", "Huma Therman", "Report Tester"],
    lastMessage: "Don't know how I feel about the new navbar padding",
    time: "Yesterday",
    description: "Creative direction, Figma specs & asset reviews",
    channel: "#Designer'ss",
  },
  {
    id: "group_3",
    name: "Hencework Core",
    avatarLetter: "H",
    avatarColor: "bg-teal-600 text-white",
    memberCount: 22,
    members: ["Report Tester", "Alan Rickman", "Billy Zen"],
    lastMessage: "Hi There, I am using the new Jampack SaaS features",
    time: "2 days ago",
    description: "Executive announcements and cross-functional sync",
    channel: "#HRManagement",
  },
  {
    id: "group_4",
    name: "Support Team",
    avatarLetter: "S",
    avatarColor: "bg-blue-600 text-white",
    memberCount: 6,
    members: ["Bradley Cooper", "Alex Morgan"],
    lastMessage: "contact@hencework.com tickets resolved",
    time: "3 days ago",
    description: "Tier 1 & Tier 2 customer incident resolution",
    channel: "#Team_goals",
  },
];

interface ClassicChatAppProps {
  initialMode: ChatMode;
}

export function ClassicChatApp({ initialMode }: ClassicChatAppProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ChatMode>(initialMode);
  const [selectedContact, setSelectedContact] = useState<ContactItem>(DEFAULT_CONTACTS[0]);
  const [selectedGroup, setSelectedGroup] = useState<GroupItem>(DEFAULT_GROUPS[0]);
  const [showInfo, setShowInfo] = useState(true);
  const [infoTab, setInfoTab] = useState<"info" | "files">("info");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [audioCallModalOpen, setAudioCallModalOpen] = useState(false);
  const [videoCallModalOpen, setVideoCallModalOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>([
    {
      id: "seed_1",
      senderId: "other",
      senderName: "Report Tester",
      content: "Anyways, I am working on something that you would like to know. This project is based on angular js and you are the keeda in it. I need you help in it.",
      types: "received",
      time: "11:52 PM",
    },
    {
      id: "seed_2",
      senderId: "me",
      senderName: "Me",
      content: "Haha, this joke is hilarious. Is it what your heart feel about the salary? \uD83D\uDE0E",
      types: "sent",
      time: "10:52 PM",
    },
    {
      id: "seed_3",
      senderId: "other",
      senderName: "Report Tester",
      content: "Hey Ben, just a reminder that you are coming for the meeting today in the conference. We are proposing a change in the client briefing.",
      types: "received",
      time: "9:20 AM",
    },
  ]);

  const activeThreadId = mode === "groups" ? `group_${selectedGroup.id}` : `contact_${selectedContact.id}`;

  // Real backend query for messages
  const { data: serverMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["chat-messages", activeThreadId],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/chat/messages/${activeThreadId}`);
        const data = Array.isArray(res) ? res : (res?.data || []);
        return data as ChatMessageItem[];
      } catch {
        return [];
      }
    },
    refetchInterval: 5000,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, serverMessages]);

  // Call timer simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (audioCallModalOpen || videoCallModalOpen) {
      timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [audioCallModalOpen, videoCallModalOpen]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    const text = messageInput.trim();
    const newMsg: ChatMessageItem = {
      id: `local_${Date.now()}`,
      senderId: "me",
      senderName: "Me",
      content: text,
      types: "sent",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setLocalMessages((prev) => [...prev, newMsg]);
    setMessageInput("");

    try {
      await api.post("/api/chat/messages", {
        threadId: activeThreadId,
        content: text,
      });
      refetchMessages();
    } catch {
      // Local optimistic message remains visible
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const allDisplayMessages = [
    ...localMessages,
    ...serverMessages.map((m) => ({
      ...m,
      types: (m.senderId === "me" || m.senderId === "system" ? "sent" : "received") as "sent" | "received",
      time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Now",
    })),
  ];

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background border-t border-border">
      {/* ─── LEFT PANEL: CONTACT / GROUP SELECTOR ─── */}
      <aside className="w-[320px] flex-shrink-0 border-r border-border flex flex-col bg-card">
        {/* Top Header */}
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 font-bold text-lg text-foreground hover:text-primary transition-colors cursor-pointer">
                <span>{mode === "chats" ? "Chat" : mode === "groups" ? "Groups" : "Contact"}</span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                onClick={() => setMode("chats")}
                className={cn("cursor-pointer", mode === "chats" && "font-semibold text-primary")}
              >
                <MessageSquare className="size-4 mr-2" />
                Personal Chats
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setMode("groups")}
                className={cn("cursor-pointer", mode === "groups" && "font-semibold text-primary")}
              >
                <Users className="size-4 mr-2" />
                Chat Groups
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setMode("contacts")}
                className={cn("cursor-pointer", mode === "contacts" && "font-semibold text-primary")}
              >
                <User className="size-4 mr-2" />
                Contacts List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1">
            <button
              onClick={() => toast.info("Opening chat preferences...")}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Chat Settings"
            >
              <Settings className="size-4.5" />
            </button>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="size-7.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
              title="Invite People"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={mode === "chats" ? "Search Chats" : mode === "groups" ? "Search Groups" : "Search Contacts"}
              className="pl-8 text-xs h-8.5 bg-muted/40 border-border/70 rounded-md"
            />
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {mode === "chats" && (
            <>
              {/* Frequent Contact Avatars */}
              <div className="p-3 border-b border-border/50">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Frequent contact
                </p>
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {DEFAULT_CONTACTS.slice(0, 5).map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className="relative flex-shrink-0 cursor-pointer group"
                    >
                      <div
                        className={cn(
                          "size-9 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-transform group-hover:scale-105",
                          contact.avatarColor
                        )}
                      >
                        {contact.avatarLetter}
                      </div>
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card",
                          contact.status === "online" ? "bg-emerald-500" : "bg-slate-400"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Threads */}
              <div className="p-1 space-y-0.5">
                {DEFAULT_CONTACTS.filter(
                  (c) =>
                    !searchQuery ||
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((c) => {
                  const isSelected = selectedContact.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContact(c)}
                      className={cn(
                        "w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer",
                        isSelected ? "bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900" : "hover:bg-muted/60"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className={cn(
                            "size-10 rounded-full flex items-center justify-center font-bold text-sm",
                            c.avatarColor
                          )}
                        >
                          {c.avatarLetter}
                        </div>
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card",
                            c.status === "online" ? "bg-emerald-500" : "bg-slate-400"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5
                            className={cn(
                              "text-xs font-semibold truncate",
                              isSelected ? "text-teal-900 dark:text-teal-200" : "text-foreground"
                            )}
                          >
                            {c.name}
                          </h5>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-1">{c.time}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {mode === "groups" && (
            <div className="p-2 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Active Groups
                </p>
                <div className="space-y-1">
                  {DEFAULT_GROUPS.map((g) => {
                    const isSelected = selectedGroup.id === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGroup(g)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer",
                          isSelected ? "bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900" : "hover:bg-muted/60"
                        )}
                      >
                        <div
                          className={cn(
                            "size-10 rounded-full flex items-center justify-center font-bold text-sm",
                            g.avatarColor
                          )}
                        >
                          {g.avatarLetter}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold text-foreground truncate">{g.name}</h5>
                            <span className="text-[10px] text-muted-foreground">{g.time}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{g.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Channels
                </p>
                <div className="space-y-0.5 px-1">
                  {["#Developer", "#Designer'ss", "#HRManagement", "#Team_goals"].map((ch) => (
                    <button
                      key={ch}
                      onClick={() => toast.info(`Joined channel ${ch}`)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-primary font-bold">#</span>
                      <span>{ch.replace("#", "")}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === "contacts" && (
            <div className="p-2 space-y-3">
              {["A", "B"].map((letter) => {
                const groupList = DEFAULT_CONTACTS.filter((c) => c.name.startsWith(letter));
                if (groupList.length === 0) return null;
                return (
                  <div key={letter}>
                    <p className="text-[11px] font-bold text-teal-700 dark:text-teal-400 px-2.5 py-1 uppercase">
                      {letter}
                    </p>
                    <div className="space-y-1">
                      {groupList.map((c) => {
                        const isSelected = selectedContact.id === c.id;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelectedContact(c)}
                            className={cn(
                              "w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                              isSelected ? "bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900" : "hover:bg-muted/60"
                            )}
                          >
                            <div className="relative flex-shrink-0">
                              <div
                                className={cn(
                                  "size-8.5 rounded-full flex items-center justify-center font-bold text-xs",
                                  c.avatarColor
                                )}
                              >
                                {c.avatarLetter}
                              </div>
                              <span
                                className={cn(
                                  "absolute bottom-0 right-0 size-2 rounded-full border-2 border-card",
                                  c.status === "online" ? "bg-emerald-500" : "bg-slate-400"
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-semibold text-foreground truncate">{c.name}</h5>
                              <p className="text-[10px] text-muted-foreground truncate">{c.statusText || c.title}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ─── CENTER PANEL: CONVERSATION WINDOW ─── */}
      <section className="flex-1 flex flex-col bg-background min-w-0">
        {/* Chat Header Bar */}
        <div className="h-14 px-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div
                className={cn(
                  "size-9 rounded-full flex items-center justify-center font-bold text-xs",
                  mode === "groups" ? selectedGroup.avatarColor : selectedContact.avatarColor
                )}
              >
                {mode === "groups" ? selectedGroup.avatarLetter : selectedContact.avatarLetter}
              </div>
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-card" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-foreground truncate">
                {mode === "groups" ? selectedGroup.name : selectedContact.name}
              </h4>
              <p className="text-[11px] text-muted-foreground truncate">
                {mode === "groups" ? `Active 1min ago • ${selectedGroup.memberCount} members` : selectedContact.statusText || "Online"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setInviteModalOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Add member"
            >
              <UserPlus className="size-4" />
            </button>
            <button
              onClick={() => setAudioCallModalOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Audio Call"
            >
              <Phone className="size-4" />
            </button>
            <button
              onClick={() => setVideoCallModalOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Video Call"
            >
              <Video className="size-4" />
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer",
                showInfo ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Toggle Details"
            >
              <InfoIcon className="size-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  <MoreVertical className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => toast.info("Thread pinned")} className="cursor-pointer">
                  Pin Thread
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Notifications muted")} className="cursor-pointer">
                  Mute Notifications
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setLocalMessages([]);
                    toast.success("Chat history cleared locally");
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  Clear History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-center my-2">
            <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/40">
              Today
            </span>
          </div>

          {allDisplayMessages.map((msg) => {
            const isSent = msg.types === "sent";
            return (
              <div
                key={msg.id}
                className={cn("flex items-end gap-2.5 max-w-[80%]", isSent ? "ml-auto flex-row-reverse" : "mr-auto")}
              >
                {!isSent && (
                  <div className="size-7 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {mode === "groups" ? selectedGroup.avatarLetter : selectedContact.avatarLetter}
                  </div>
                )}
                <div className="space-y-1">
                  <div
                    className={cn(
                      "px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-2xs",
                      isSent
                        ? "bg-teal-700 text-white rounded-br-none"
                        : "bg-muted/80 text-foreground border border-border/60 rounded-bl-none"
                    )}
                  >
                    {msg.content}
                  </div>
                  <div
                    className={cn(
                      "text-[10px] text-muted-foreground flex items-center gap-1",
                      isSent ? "justify-end" : "justify-start"
                    )}
                  >
                    <span>{msg.time}</span>
                    {isSent && <Check className="size-3 text-teal-600 dark:text-teal-400" />}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Footer Bar */}
        <div className="p-3 border-t border-border bg-card flex items-center gap-2">
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.onchange = (e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                  toast.success(`Attached '${file.name}' (${Math.round(file.size / 1024)} KB)`);
                }
              };
              input.click();
            }}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
            title="Upload file / attachment"
          >
            <Paperclip className="size-4.5" />
          </button>

          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 text-xs h-9 bg-muted/30 border-border/80 rounded-full px-4 focus-visible:ring-teal-600"
          />

          <button
            onClick={() => setMessageInput((prev) => prev + " \uD83D\uDC4D ")}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
            title="Insert emoji"
          >
            <Smile className="size-4.5" />
          </button>

          <Button
            onClick={handleSendMessage}
            size="sm"
            className="rounded-full size-8.5 p-0 bg-teal-700 hover:bg-teal-800 text-white cursor-pointer shadow-xs"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </section>

      {/* ─── RIGHT PANEL: CONTACT / GROUP INFO DRAWER ─── */}
      {showInfo && (
        <aside className="w-[300px] flex-shrink-0 border-l border-border bg-card flex flex-col overflow-y-auto">
          {/* Top Profile Card */}
          <div className="p-6 text-center border-b border-border/70 flex flex-col items-center">
            <div
              className={cn(
                "size-20 rounded-full flex items-center justify-center font-bold text-2xl mb-3 shadow-md",
                mode === "groups" ? selectedGroup.avatarColor : selectedContact.avatarColor
              )}
            >
              {mode === "groups" ? selectedGroup.avatarLetter : selectedContact.avatarLetter}
            </div>
            <h3 className="font-bold text-sm text-foreground">
              {mode === "groups" ? selectedGroup.name : selectedContact.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === "groups" ? selectedGroup.description : selectedContact.statusText || "Active contributor"}
            </p>

            {/* Info / Files Toggle Buttons */}
            <div className="grid grid-cols-2 gap-2 w-full mt-4">
              <Button
                variant={infoTab === "info" ? "default" : "outline"}
                size="sm"
                onClick={() => setInfoTab("info")}
                className={cn(
                  "text-xs h-8 cursor-pointer",
                  infoTab === "info" ? "bg-teal-700 hover:bg-teal-800 text-white" : ""
                )}
              >
                Info
              </Button>
              <Button
                variant={infoTab === "files" ? "default" : "outline"}
                size="sm"
                onClick={() => setInfoTab("files")}
                className={cn(
                  "text-xs h-8 cursor-pointer",
                  infoTab === "files" ? "bg-teal-700 hover:bg-teal-800 text-white" : ""
                )}
              >
                Files
              </Button>
            </div>
          </div>

          {/* Search inside conversation */}
          <div className="p-3 border-b border-border/50">
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search in conversation"
                className="pl-8 text-xs h-8 bg-muted/30 border-border/70 rounded-md"
              />
            </div>
          </div>

          {infoTab === "info" ? (
            <div className="p-4 space-y-5 text-xs divide-y divide-border/40">
              {/* Group Members or Personal Info */}
              {mode === "groups" ? (
                <div>
                  <h6 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-2.5">
                    Members ({selectedGroup.memberCount})
                  </h6>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroup.members.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded-md text-[11px] font-medium"
                      >
                        <span className="size-2 rounded-full bg-emerald-500" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 pt-1">
                  <h6 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-2">
                    General Info
                  </h6>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <User className="size-3.5 text-primary flex-shrink-0" />
                    <span className="truncate">{selectedContact.title}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <FileText className="size-3.5 text-primary flex-shrink-0" />
                    <span className="truncate">{selectedContact.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Phone className="size-3.5 text-primary flex-shrink-0" />
                    <span className="truncate">{selectedContact.phone}</span>
                  </div>
                </div>
              )}

              {/* Biography */}
              <div className="pt-3">
                <h6 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-1.5">
                  Biography
                </h6>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {selectedContact.bio || "Active enterprise user contributing to project milestones."}
                </p>
              </div>

              {/* Actions & Settings */}
              <div className="pt-3 space-y-1.5">
                <h6 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-1.5">
                  Settings
                </h6>
                <button
                  onClick={() => toast.info("Notifications muted")}
                  className="w-full text-left py-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Mute Notifications
                </button>
                <button
                  onClick={() => toast.info("Shared links opened")}
                  className="w-full text-left py-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  View Shared Media
                </button>
                <button
                  onClick={() => toast.error("User blocked")}
                  className="w-full text-left py-1 text-destructive hover:underline transition-colors cursor-pointer"
                >
                  Block Contact
                </button>
              </div>
            </div>
          ) : (
            /* Files Tab */
            <div className="p-3 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Shared Files (3)
              </p>
              {[
                { name: "jampack.zip", size: "2.45 GB", date: "10/22/2026" },
                { name: "brand-guidelines.pdf", size: "12.8 MB", date: "10/18/2026" },
                { name: "client-brief.docx", size: "1.2 MB", date: "10/15/2026" },
              ].map((f, i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between text-xs hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="size-4 text-teal-600 flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-medium truncate">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground">{f.size}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.success(`Downloading ${f.name}...`)}
                    className="p-1 hover:text-primary transition-colors cursor-pointer"
                  >
                    <Download className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* ─── MODAL 1: INVITE PEOPLE ─── */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Invite People to Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Enter email address or name..." className="text-xs" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Contacts</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {DEFAULT_CONTACTS.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "size-7 rounded-full flex items-center justify-center font-bold text-xs",
                        c.avatarColor
                      )}
                    >
                      {c.avatarLetter}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.email}</p>
                    </div>
                  </div>
                  <input type="checkbox" className="rounded border-border" />
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-teal-700 hover:bg-teal-800 text-white"
              onClick={() => {
                setInviteModalOpen(false);
                toast.success("Invitations sent successfully!");
              }}
            >
              Send Invitations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: AUDIO CALL ─── */}
      <Dialog open={audioCallModalOpen} onOpenChange={setAudioCallModalOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-6 flex flex-col items-center">
            <div className="size-20 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-2xl mb-3 shadow-lg animate-pulse">
              {selectedContact.avatarLetter}
            </div>
            <h4 className="font-bold text-base">{selectedContact.name}</h4>
            <p className="text-xs text-muted-foreground mt-1">Audio Call in Progress</p>
            <p className="text-lg font-mono font-semibold text-teal-600 mt-2">{formatCallTime(callDuration)}</p>

            <div className="flex items-center gap-4 mt-6">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
                className="rounded-full size-10 cursor-pointer"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full size-12 cursor-pointer shadow-md"
                onClick={() => {
                  setAudioCallModalOpen(false);
                  toast.info("Audio call ended");
                }}
              >
                <PhoneOff className="size-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: VIDEO CALL ─── */}
      <Dialog open={videoCallModalOpen} onOpenChange={setVideoCallModalOpen}>
        <DialogContent className="max-w-lg text-center">
          <div className="py-4 flex flex-col items-center">
            <div className="w-full h-56 bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-border">
              {isVideoOff ? (
                <div className="text-muted-foreground text-xs flex flex-col items-center gap-2">
                  <VideoOff className="size-8" />
                  <span>Camera is turned off</span>
                </div>
              ) : (
                <div className="text-white text-xs flex flex-col items-center gap-2">
                  <div className="size-16 rounded-full bg-teal-600 flex items-center justify-center font-bold text-xl">
                    {selectedContact.avatarLetter}
                  </div>
                  <span>Connected with {selectedContact.name}</span>
                </div>
              )}
              <div className="absolute top-3 right-3 bg-black/60 px-2 py-0.5 rounded text-[11px] font-mono text-white">
                {formatCallTime(callDuration)}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-5">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
                className="rounded-full size-10 cursor-pointer"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>
              <Button
                variant={isVideoOff ? "destructive" : "outline"}
                size="icon"
                className="rounded-full size-10 cursor-pointer"
                onClick={() => setIsVideoOff(!isVideoOff)}
              >
                {isVideoOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full size-12 cursor-pointer shadow-md"
                onClick={() => {
                  setVideoCallModalOpen(false);
                  toast.info("Video call ended");
                }}
              >
                <PhoneOff className="size-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
