import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Inbox,
  Send,
  FileText,
  Trash2,
  AlertOctagon,
  RefreshCw,
  Search,
  Plus,
  ArrowLeft,
  Reply,
  Forward,
  Star,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Settings,
  Paperclip,
  User,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export interface EmailAccount {
  id: string;
  email: string;
  displayName: string;
  fromName?: string;
  incomingProtocol: "IMAP" | "POP3";
  incomingHost: string;
  incomingPort: number;
  status: "NOT_CONFIGURED" | "CONNECTED" | "CONNECTION_FAILED";
  statusMessage?: string;
  isDefault: boolean;
}

export interface MailboxMessage {
  id: string;
  uid?: string;
  from: string;
  to: string | string[];
  subject: string;
  date: string;
  snippet?: string;
  body?: string;
  isRead?: boolean;
  isStarred?: boolean;
  folder?: string;
  isLocalDraft?: boolean;
}

export interface LocalDraft {
  id: string;
  accountId: string;
  to: string;
  subject: string;
  body: string;
  savedAt: string;
}

export function MailboxClient() {
  const qc = useQueryClient();

  // Selected Account & Folder State
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string>("INBOX");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<MailboxMessage | null>(null);

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Local Drafts State (isolated per user/account)
  const [localDrafts, setLocalDrafts] = useState<LocalDraft[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("hrms_local_mail_drafts");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const saveLocalDraftsToStorage = (drafts: LocalDraft[]) => {
    setLocalDrafts(drafts);
    try {
      localStorage.setItem("hrms_local_mail_drafts", JSON.stringify(drafts));
    } catch {}
  };

  // 1. Fetch User Email Accounts
  const { data: accounts = [], isLoading: loadingAccounts, isError: accountsError } = useQuery<EmailAccount[]>({
    queryKey: ["user-email-accounts"],
    queryFn: async () => {
      const res = await api.get<EmailAccount[]>("/user/email-accounts");
      return Array.isArray(res) ? res : [];
    },
  });

  // Auto-select default or first account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const def = accounts.find((a) => a.isDefault) || accounts[0];
      setSelectedAccountId(def.id);
    }
  }, [accounts, selectedAccountId]);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || null;

  // 2. Fetch Messages for Active Account and Folder
  const {
    data: messagesData,
    isLoading: loadingMessages,
    isError: messagesError,
    error: messagesErrorObj,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["mailbox-messages", selectedAccountId, activeFolder],
    queryFn: async () => {
      if (!selectedAccountId) return [];
      if (activeFolder === "Drafts") {
        return []; // Local drafts handled separately
      }
      const res = await api.get<{ success?: boolean; messages?: MailboxMessage[]; error?: string }>(
        `/user/email-accounts/${selectedAccountId}/messages?folder=${encodeURIComponent(activeFolder)}`
      );
      if (Array.isArray(res)) return res;
      if (res?.messages && Array.isArray(res.messages)) return res.messages;
      return [];
    },
    enabled: !!selectedAccountId && activeFolder !== "Drafts",
    retry: 1,
  });

  // Combine server messages with local drafts if Drafts folder
  const displayedMessages: MailboxMessage[] = useMemo(() => {
    if (activeFolder === "Drafts") {
      const accountDrafts = localDrafts.filter(
        (d) => !selectedAccountId || d.accountId === selectedAccountId
      );
      return accountDrafts.map((d) => ({
        id: d.id,
        from: activeAccount?.email || "Draft",
        to: d.to,
        subject: d.subject || "(No Subject)",
        date: d.savedAt,
        snippet: d.body ? d.body.substring(0, 120) : "(Empty message draft)",
        body: d.body,
        isLocalDraft: true,
      }));
    }

    const msgs: MailboxMessage[] = Array.isArray(messagesData) ? messagesData : [];
    if (!searchQuery.trim()) return msgs;

    const q = searchQuery.toLowerCase();
    return msgs.filter(
      (m) =>
        m.subject?.toLowerCase().includes(q) ||
        m.from?.toLowerCase().includes(q) ||
        (typeof m.to === "string" && m.to.toLowerCase().includes(q)) ||
        m.snippet?.toLowerCase().includes(q)
    );
  }, [activeFolder, localDrafts, selectedAccountId, activeAccount, messagesData, searchQuery]);

  // Handle Compose open with optional prefill (for reply/forward)
  const handleOpenCompose = (prefill?: { to?: string; subject?: string; body?: string }) => {
    if (!activeAccount) {
      toast.error("Please configure an email account before composing messages.");
      return;
    }
    setComposeTo(prefill?.to || "");
    setComposeSubject(prefill?.subject || "");
    setComposeBody(prefill?.body || "");
    setIsComposeOpen(true);
  };

  // Save current compose as Local Draft
  const handleSaveLocalDraft = () => {
    if (!selectedAccountId) return;
    const newDraft: LocalDraft = {
      id: "draft-" + Date.now(),
      accountId: selectedAccountId,
      to: composeTo,
      subject: composeSubject,
      body: composeBody,
      savedAt: new Date().toISOString(),
    };
    saveLocalDraftsToStorage([newDraft, ...localDrafts]);
    toast.success("Draft saved locally to personal workspace.");
    setIsComposeOpen(false);
  };

  // Send Email mutation via authenticated user's SMTP account
  const handleSendEmail = async () => {
    if (!selectedAccountId || !activeAccount) {
      toast.error("No active email account selected.");
      return;
    }
    if (!composeTo || !composeTo.includes("@")) {
      toast.error("Please provide at least one valid recipient email address.");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await api.post<{ success: boolean; messageId?: string; error?: string; code?: string }>(
        `/user/email-accounts/${selectedAccountId}/send`,
        {
          to: composeTo.split(",").map((s) => s.trim()).filter(Boolean),
          subject: composeSubject || "(No Subject)",
          body: composeBody,
        }
      );

      if (res.success) {
        toast.success(`Email dispatched successfully! Message ID: ${res.messageId || "OK"}`);
        setIsComposeOpen(false);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        // If sent from drafts, clean up matching draft
        saveLocalDraftsToStorage(localDrafts.filter((d) => d.body !== composeBody));
        refetchMessages();
      } else {
        toast.error(`Outbound delivery failed: ${res.error || "Mail server rejected message"}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch email. Check SMTP host and credentials in Settings.");
    } finally {
      setSendingEmail(false);
    }
  };

  // Reply handler
  const handleReply = () => {
    if (!selectedMessage) return;
    handleOpenCompose({
      to: selectedMessage.from,
      subject: selectedMessage.subject.startsWith("Re:") ? selectedMessage.subject : `Re: ${selectedMessage.subject}`,
      body: `\n\n--- On ${selectedMessage.date}, ${selectedMessage.from} wrote:\n> ${selectedMessage.body || selectedMessage.snippet || ""}`,
    });
  };

  // Forward handler
  const handleForward = () => {
    if (!selectedMessage) return;
    handleOpenCompose({
      to: "",
      subject: selectedMessage.subject.startsWith("Fwd:") ? selectedMessage.subject : `Fwd: ${selectedMessage.subject}`,
      body: `\n\n--- Forwarded message ---\nFrom: ${selectedMessage.from}\nDate: ${selectedMessage.date}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.body || selectedMessage.snippet || ""}`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Account Switcher Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Mail className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground">Email Mailbox Client</h2>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                Webmail • SMTP • IMAP
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalized inbound and outbound mailbox client strictly isolated to your user account.
            </p>
          </div>
        </div>

        {/* Account Selector & Compose Button */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {accounts.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Active Mailbox:</span>
              <Select value={selectedAccountId || ""} onValueChange={(val) => setSelectedAccountId(val)}>
                <SelectTrigger className="h-9 text-xs w-[220px] font-mono">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.email} {a.isDefault ? "(Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Link to={"/settings/email-accounts" as any}>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-dashed text-primary">
                <Settings className="size-3.5" />
                Configure Email Account
              </Button>
            </Link>
          )}

          <Button onClick={() => handleOpenCompose()} size="sm" className="h-9 text-xs gap-2">
            <Plus className="size-4" />
            Compose Email
          </Button>
        </div>
      </div>

      {/* Main Mailbox Grid: Sidebar + Message List + Reader */}
      {accounts.length === 0 && !loadingAccounts ? (
        /* Empty State: No Accounts Configured */
        <Card className="border shadow-2xs">
          <CardContent className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Mail className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-foreground">No Email Accounts Configured</h3>
              <p className="text-xs text-muted-foreground">
                To send and read personal emails in MASTERHRMS, configure your SMTP, IMAP, or POP3 credentials.
                Your credentials will be encrypted at rest and isolated to your user account.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link to={"/settings/email-accounts" as any}>
                <Button size="sm" className="gap-2">
                  <Settings className="size-4" />
                  Go to Email Accounts Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Folders Navigation (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <Card className="border shadow-2xs bg-card">
              <CardContent className="p-3 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveFolder("INBOX");
                    setSelectedMessage(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                    activeFolder === "INBOX"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Inbox className="size-4" />
                    Inbox
                  </span>
                  {activeFolder === "INBOX" && displayedMessages.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                      {displayedMessages.length}
                    </Badge>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFolder("Sent");
                    setSelectedMessage(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                    activeFolder === "Sent"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Send className="size-4" />
                    Sent Messages
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFolder("Drafts");
                    setSelectedMessage(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                    activeFolder === "Drafts"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <FileText className="size-4" />
                    Drafts (Local)
                  </span>
                  {localDrafts.length > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                      {localDrafts.length}
                    </Badge>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFolder("Trash");
                    setSelectedMessage(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                    activeFolder === "Trash"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Trash2 className="size-4" />
                    Trash
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFolder("Spam");
                    setSelectedMessage(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                    activeFolder === "Spam"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <AlertOctagon className="size-4" />
                    Spam / Junk
                  </span>
                </button>
              </CardContent>
            </Card>

            {/* Account Status Card */}
            {activeAccount && (
              <Card className="border shadow-2xs bg-muted/20">
                <CardContent className="p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-[11px]">Server Sync Status:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-mono",
                        activeAccount.status === "CONNECTED"
                          ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                          : activeAccount.status === "CONNECTION_FAILED"
                          ? "border-rose-500/30 text-rose-600 bg-rose-500/10"
                          : "text-muted-foreground"
                      )}
                    >
                      {activeAccount.status}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5 font-mono">
                    <p>Host: {activeAccount.incomingHost}:{activeAccount.incomingPort}</p>
                    <p>Protocol: {activeAccount.incomingProtocol}</p>
                  </div>
                  <Link to={"/settings/email-accounts" as any} className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold pt-1">
                    Manage Accounts <ExternalLink className="size-3" />
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Middle/Right Columns: Message List & Detail Reader (9 cols) */}
          <div className="lg:col-span-9 space-y-3">
            {selectedMessage ? (
              /* Message Detail Reader View */
              <Card className="border shadow-2xs bg-card">
                <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMessage(null)}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to {activeFolder}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReply} className="h-8 gap-1.5 text-xs">
                      <Reply className="size-3.5" />
                      Reply
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleForward} className="h-8 gap-1.5 text-xs">
                      <Forward className="size-3.5" />
                      Forward
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5 border-b pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-base font-bold text-foreground">{selectedMessage.subject}</h3>
                      {selectedMessage.isLocalDraft && (
                        <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 bg-amber-50">
                          Local Workspace Draft
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between flex-wrap text-xs text-muted-foreground gap-2 pt-1 font-mono">
                      <span><strong>From:</strong> {selectedMessage.from}</span>
                      <span><strong>Date:</strong> {selectedMessage.date ? new Date(selectedMessage.date).toLocaleString() : "Recent"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      <span><strong>To:</strong> {Array.isArray(selectedMessage.to) ? selectedMessage.to.join(", ") : selectedMessage.to}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="text-xs leading-relaxed text-foreground whitespace-pre-wrap min-h-[160px] p-4 rounded-xl border bg-muted/10 font-sans">
                    {selectedMessage.body || selectedMessage.snippet || "(No message body content)"}
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Message List View */
              <Card className="border shadow-2xs bg-card">
                <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground capitalize">{activeFolder}</h3>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {displayedMessages.length} message{displayedMessages.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-[200px]">
                      <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="Search mailbox..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchMessages()}
                      disabled={loadingMessages}
                      className="size-8 p-0"
                    >
                      <RefreshCw className={cn("size-3.5", loadingMessages && "animate-spin")} />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0 divide-y">
                  {loadingMessages ? (
                    <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                      <RefreshCw className="size-6 animate-spin mx-auto text-primary" />
                      <p>Synchronizing with mail server...</p>
                    </div>
                  ) : messagesError ? (
                    <div className="p-8 text-center text-xs space-y-2 text-rose-600 bg-rose-500/5">
                      <AlertTriangle className="size-6 mx-auto text-rose-600" />
                      <p className="font-bold">Mailbox Synchronization Error</p>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {(messagesErrorObj as any)?.message || "Could not connect to incoming mail server. Verify your IMAP/POP3 host and credentials in Email Accounts settings."}
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetchMessages()} className="mt-2 text-xs">
                        Retry Sync
                      </Button>
                    </div>
                  ) : displayedMessages.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                      <Mail className="size-8 mx-auto text-muted-foreground/50" />
                      <p className="font-medium text-foreground">No messages in {activeFolder}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {activeFolder === "Drafts"
                          ? "Saved personal drafts will appear here."
                          : "Incoming messages synchronized from your IMAP provider will be displayed here."}
                      </p>
                    </div>
                  ) : (
                    displayedMessages.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedMessage(msg)}
                        className="p-3.5 hover:bg-muted/30 cursor-pointer transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground truncate max-w-[180px]">
                              {msg.from}
                            </span>
                            {msg.isLocalDraft && (
                              <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-600 bg-amber-500/10">
                                Local Draft
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-foreground truncate">{msg.subject}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{msg.snippet || "(No content)"}</p>
                        </div>

                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono pt-0.5">
                          {msg.date ? new Date(msg.date).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Compose & Send Email Modal */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Send className="size-4 text-primary" />
              Compose New Email
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sending from your verified personal mailbox (<code className="font-mono text-primary font-bold">{activeAccount?.email}</code>).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">From Account</Label>
              <Input
                disabled
                value={activeAccount ? `${activeAccount.displayName || activeAccount.email} <${activeAccount.email}>` : ""}
                className="h-8 text-xs bg-muted font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">To (Recipients) *</Label>
              <Input
                placeholder="client@acme.com, manager@company.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-muted-foreground block">
                Separate multiple recipient email addresses with commas.
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subject</Label>
              <Input
                placeholder="Subject of your message..."
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Message Body</Label>
              <Textarea
                rows={8}
                placeholder="Write your email message here..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="text-xs leading-relaxed font-sans"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveLocalDraft}
              className="text-xs h-8 gap-1.5"
            >
              <FileText className="size-3.5" />
              Save as Draft
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsComposeOpen(false)}
                className="text-xs h-8"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSendEmail}
                disabled={sendingEmail || !composeTo}
                className="text-xs h-8 gap-1.5"
              >
                {sendingEmail ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                {sendingEmail ? "Dispatching..." : "Send Email"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
