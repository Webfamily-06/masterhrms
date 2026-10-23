'use client';

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Server,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Trash2,
  Edit2,
  Star,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface UserEmailAccount {
  id: string;
  email: string;
  displayName: string;
  fromName?: string;
  username: string;
  incomingProtocol: "IMAP" | "POP3";
  incomingHost: string;
  incomingPort: number;
  incomingSecurity: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: string;
  smtpUser?: string;
  status: "NOT_CONFIGURED" | "CONNECTED" | "CONNECTION_FAILED";
  statusMessage?: string;
  lastTestedAt?: string;
  isDefault: boolean;
  hasIncomingPassword?: boolean;
  hasSmtpPassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_FORM_STATE = {
  id: null as string | null,
  email: "",
  displayName: "",
  fromName: "",
  username: "",
  incomingProtocol: "IMAP" as "IMAP" | "POP3",
  incomingHost: "",
  incomingPort: 993,
  incomingSecurity: "SSL/TLS",
  incomingPassword: "",
  smtpHost: "",
  smtpPort: 465,
  smtpSecurity: "SSL/TLS",
  smtpUser: "",
  smtpPassword: "",
  isDefault: false,
};

export function UserEmailAccountsSettings() {
  const qc = useQueryClient();

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [showIncomingPass, setShowIncomingPass] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // Testing & Verification states
  const [testingIncomingId, setTestingIncomingId] = useState<string | null>(null);
  const [testingSmtpId, setTestingSmtpId] = useState<string | null>(null);
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [testEmailAccount, setTestEmailAccount] = useState<UserEmailAccount | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [sendingTestMail, setSendingTestMail] = useState(false);

  // Accounts query
  const { data: accounts = [], isLoading, isError, error, refetch } = useQuery<UserEmailAccount[]>({
    queryKey: ["user-email-accounts"],
    queryFn: async () => {
      const res = await api.get<UserEmailAccount[]>("/user/email-accounts");
      return Array.isArray(res) ? res : [];
    },
  });

  const handleOpenAdd = () => {
    setFormData(DEFAULT_FORM_STATE);
    setShowIncomingPass(false);
    setShowSmtpPass(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (acc: UserEmailAccount) => {
    setFormData({
      id: acc.id,
      email: acc.email,
      displayName: acc.displayName || "",
      fromName: acc.fromName || "",
      username: acc.username || acc.email,
      incomingProtocol: acc.incomingProtocol || "IMAP",
      incomingHost: acc.incomingHost || "",
      incomingPort: acc.incomingPort || (acc.incomingProtocol === "POP3" ? 995 : 993),
      incomingSecurity: acc.incomingSecurity || "SSL/TLS",
      incomingPassword: "", // Empty to preserve existing encrypted credentials
      smtpHost: acc.smtpHost || "",
      smtpPort: acc.smtpPort || 465,
      smtpSecurity: acc.smtpSecurity || "SSL/TLS",
      smtpUser: acc.smtpUser || acc.email,
      smtpPassword: "", // Empty to preserve existing encrypted credentials
      isDefault: Boolean(acc.isDefault),
    });
    setShowIncomingPass(false);
    setShowSmtpPass(false);
    setIsFormOpen(true);
  };

  // Preset Providers helper
  const applyPreset = (preset: "gmail" | "outlook" | "yahoo" | "custom") => {
    if (preset === "gmail") {
      setFormData((prev) => ({
        ...prev,
        incomingProtocol: "IMAP",
        incomingHost: "imap.gmail.com",
        incomingPort: 993,
        incomingSecurity: "SSL/TLS",
        smtpHost: "smtp.gmail.com",
        smtpPort: 465,
        smtpSecurity: "SSL/TLS",
      }));
      toast.info("Applied Google Gmail configuration preset (App Password required)");
    } else if (preset === "outlook") {
      setFormData((prev) => ({
        ...prev,
        incomingProtocol: "IMAP",
        incomingHost: "outlook.office365.com",
        incomingPort: 993,
        incomingSecurity: "SSL/TLS",
        smtpHost: "smtp.office365.com",
        smtpPort: 587,
        smtpSecurity: "STARTTLS",
      }));
      toast.info("Applied Microsoft 365 / Outlook preset");
    } else if (preset === "yahoo") {
      setFormData((prev) => ({
        ...prev,
        incomingProtocol: "IMAP",
        incomingHost: "imap.mail.yahoo.com",
        incomingPort: 993,
        incomingSecurity: "SSL/TLS",
        smtpHost: "smtp.mail.yahoo.com",
        smtpPort: 465,
        smtpSecurity: "SSL/TLS",
      }));
      toast.info("Applied Yahoo Mail configuration preset");
    }
  };

  // Protocol toggle changes default ports
  const handleProtocolChange = (proto: "IMAP" | "POP3") => {
    setFormData((prev) => ({
      ...prev,
      incomingProtocol: proto,
      incomingPort: proto === "POP3" ? 995 : 993,
      incomingSecurity: "SSL/TLS",
    }));
  };

  // Save account mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (payload.id) {
        return await api.put<UserEmailAccount>(`/user/email-accounts/${payload.id}`, payload);
      } else {
        return await api.post<UserEmailAccount>("/user/email-accounts", payload);
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["user-email-accounts"] });
      toast.success(
        variables.id
          ? `Account ${variables.email} updated successfully!`
          : `Account ${variables.email} added and encrypted successfully!`
      );
      setIsFormOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save email account configuration");
    },
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/user/email-accounts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-email-accounts"] });
      toast.success("Email account disconnected and deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove email account");
    },
  });

  // Set default account mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/user/email-accounts/${id}/set-default`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-email-accounts"] });
      toast.success("Default personal mailbox updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update default account");
    },
  });

  // Test Incoming IMAP/POP3 connection
  const handleTestIncoming = async (accId: string) => {
    setTestingIncomingId(accId);
    try {
      const res = await api.post<{ success: boolean; status: string; message: string; error?: string }>(
        `/user/email-accounts/${accId}/test-incoming`
      );
      qc.invalidateQueries({ queryKey: ["user-email-accounts"] });
      if (res.success) {
        toast.success(`Incoming connection verified: ${res.message}`);
      } else {
        toast.error(`Incoming connection failed: ${res.error || res.message}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Incoming test failed");
      qc.invalidateQueries({ queryKey: ["user-email-accounts"] });
    } finally {
      setTestingIncomingId(null);
    }
  };

  // Test Outgoing SMTP connection
  const handleTestOutgoing = async (accId: string) => {
    setTestingSmtpId(accId);
    try {
      const res = await api.post<{ success: boolean; status: string; message: string; error?: string }>(
        `/user/email-accounts/${accId}/test-outgoing`
      );
      qc.invalidateQueries({ queryKey: ["user-email-accounts"] });
      if (res.success) {
        toast.success(`SMTP connection verified: ${res.message}`);
      } else {
        toast.error(`SMTP connection failed: ${res.error || res.message}`);
      }
    } catch (err: any) {
      toast.error(err.message || "SMTP test failed");
      qc.invalidateQueries({ queryKey: ["user-email-accounts"] });
    } finally {
      setTestingSmtpId(null);
    }
  };

  // Send Test Email handler
  const handleSendTestEmail = async () => {
    if (!testEmailAccount) return;
    if (!testRecipient || !testRecipient.includes("@")) {
      toast.error("Please enter a valid recipient email address");
      return;
    }

    setSendingTestMail(true);
    try {
      const res = await api.post<{ success: boolean; message: string; messageId?: string }>(
        `/user/email-accounts/${testEmailAccount.id}/send-test`,
        { testRecipient }
      );
      if (res.success) {
        toast.success(res.message || "Test email dispatched successfully!");
        setIsTestEmailModalOpen(false);
      } else {
        toast.error(res.message || "Test email could not be delivered");
      }
    } catch (err: any) {
      toast.error(err.message || "Outbound test delivery failed");
    } finally {
      setSendingTestMail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Card */}
      <Card className="border shadow-2xs bg-card">
        <CardHeader className="py-4 px-5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Mail className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                User Email Accounts
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                  SMTP • IMAP • POP3
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Configure your personalized mailbox credentials. Passwords are encrypted at rest via AES-256-GCM and strictly scoped to your tenant user.
              </CardDescription>
            </div>
          </div>
          <Button onClick={handleOpenAdd} size="sm" className="gap-2 shrink-0">
            <Plus className="size-4" />
            Add Email Account
          </Button>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Isolation & Security Notice */}
          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-3">
            <ShieldCheck className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                Personal Mailbox Isolation & SSRF Security
              </p>
              <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
                These credentials are used exclusively by your personal mailbox client (<code className="font-mono bg-blue-500/10 px-1 py-0.5 rounded">/apps/email</code>).
                System transactional notices (invitations, OTPs, password resets) remain isolated on <code className="font-mono bg-blue-500/10 px-1 py-0.5 rounded">mail.masterhrms.com</code>.
                Private IP ranges, loopback targets, and cloud metadata endpoints are strictly forbidden.
              </p>
            </div>
          </div>

          {/* Account Listing */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="text-xs">Loading configured email accounts...</p>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-xs text-destructive border rounded-xl bg-destructive/5 space-y-2">
              <AlertTriangle className="size-6 mx-auto text-destructive" />
              <p className="font-bold">Failed to load email accounts</p>
              <p>{(error as any)?.message || "Internal server error"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                Retry Loading
              </Button>
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed p-8 space-y-3 bg-muted/10">
              <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Mail className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No Personal Email Accounts Configured</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Connect your corporate or personal email account to enable the Webmail reader, personal inbox sync, and direct outbound email dispatch.
              </p>
              <Button onClick={handleOpenAdd} size="sm" className="mt-2 gap-2">
                <Plus className="size-4" />
                Configure First Mailbox
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {accounts.map((acc) => {
                const isConnected = acc.status === "CONNECTED";
                const isFailed = acc.status === "CONNECTION_FAILED";

                return (
                  <div
                    key={acc.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all duration-150 flex flex-col lg:flex-row lg:items-center justify-between gap-4",
                      acc.isDefault
                        ? "border-primary/40 bg-primary/5 shadow-2xs"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    )}
                  >
                    {/* Left: Account Info & Badges */}
                    <div className="space-y-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Mail className="size-4 text-primary" />
                          {acc.email}
                        </span>
                        {acc.displayName && (
                          <span className="text-xs text-muted-foreground">({acc.displayName})</span>
                        )}
                        {acc.isDefault && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                            Default Mailbox
                          </Badge>
                        )}
                        {/* Status Badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-mono font-bold flex items-center gap-1",
                            isConnected && "border-emerald-500/30 text-emerald-600 bg-emerald-500/10",
                            isFailed && "border-rose-500/30 text-rose-600 bg-rose-500/10",
                            acc.status === "NOT_CONFIGURED" && "border-muted-foreground/30 text-muted-foreground bg-muted"
                          )}
                        >
                          {isConnected && <CheckCircle2 className="size-3 text-emerald-600" />}
                          {isFailed && <XCircle className="size-3 text-rose-600" />}
                          {acc.status}
                        </Badge>
                      </div>

                      {/* Connection Endpoints */}
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Server className="size-3 text-slate-500" />
                          {acc.incomingProtocol}: {acc.incomingHost}:{acc.incomingPort} ({acc.incomingSecurity})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Send className="size-3 text-indigo-500" />
                          SMTP: {acc.smtpHost}:{acc.smtpPort} ({acc.smtpSecurity})
                        </span>
                      </div>

                      {/* Status Message / Timestamp if any */}
                      {acc.statusMessage && (
                        <p className={cn("text-[11px]", isFailed ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                          {acc.statusMessage}
                          {acc.lastTestedAt && (
                            <span className="ml-1 opacity-70">
                              (Tested: {new Date(acc.lastTestedAt).toLocaleTimeString()})
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions Toolbar */}
                    <div className="flex items-center flex-wrap gap-2 shrink-0">
                      {/* Set Default */}
                      {!acc.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(acc.id)}
                          disabled={setDefaultMutation.isPending}
                          className="text-xs h-8 gap-1.5"
                        >
                          <Star className="size-3.5" />
                          Make Default
                        </Button>
                      )}

                      {/* Test Incoming */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTestIncoming(acc.id)}
                        disabled={testingIncomingId === acc.id}
                        className="text-xs h-8 gap-1.5"
                      >
                        <RefreshCw className={cn("size-3.5", testingIncomingId === acc.id && "animate-spin")} />
                        Test {acc.incomingProtocol}
                      </Button>

                      {/* Test SMTP */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTestOutgoing(acc.id)}
                        disabled={testingSmtpId === acc.id}
                        className="text-xs h-8 gap-1.5"
                      >
                        <RefreshCw className={cn("size-3.5", testingSmtpId === acc.id && "animate-spin")} />
                        Test SMTP
                      </Button>

                      {/* Send Test Mail */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTestEmailAccount(acc);
                          setTestRecipient(acc.email);
                          setIsTestEmailModalOpen(true);
                        }}
                        className="text-xs h-8 gap-1.5 text-indigo-600 border-indigo-200 dark:border-indigo-800"
                      >
                        <Send className="size-3.5" />
                        Send Test Email
                      </Button>

                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(acc)}
                        className="size-8 p-0"
                      >
                        <Edit2 className="size-3.5 text-muted-foreground" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove and disconnect account ${acc.email}?`)) {
                            deleteMutation.mutate(acc.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="size-8 p-0 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Account Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              {formData.id ? "Edit Email Account" : "Configure New Email Account"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide your mail provider credentials. Credentials are encrypted at rest with server AES keys and never exposed to the client.
            </DialogDescription>
          </DialogHeader>

          {/* Provider Presets Toolbar */}
          <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              Quick Provider Presets
            </Label>
            <div className="flex items-center flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("gmail")}
                className="text-xs h-7 gap-1"
              >
                Google Gmail
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("outlook")}
                className="text-xs h-7 gap-1"
              >
                Microsoft 365 / Outlook
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("yahoo")}
                className="text-xs h-7 gap-1"
              >
                Yahoo Mail
              </Button>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formData);
            }}
            className="space-y-4 text-xs"
          >
            {/* General Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email Address *</Label>
                <Input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => {
                    const em = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      email: em,
                      displayName: prev.displayName || em.split("@")[0] || "",
                      username: prev.username || em,
                      smtpUser: prev.smtpUser || em,
                    }));
                  }}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Display / Account Name</Label>
                <Input
                  placeholder="Work Inbox"
                  value={formData.displayName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sender From Name</Label>
                <Input
                  placeholder="John Doe"
                  value={formData.fromName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fromName: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Account Username *</Label>
                <Input
                  required
                  placeholder="Username / Full email"
                  value={formData.username}
                  onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Incoming Mail Server Section */}
            <div className="p-3.5 rounded-xl border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                  <Server className="size-3.5 text-emerald-600" />
                  Incoming Mail Server ({formData.incomingProtocol})
                </h4>
                {/* Protocol Selector */}
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleProtocolChange("IMAP")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                      formData.incomingProtocol === "IMAP" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                    )}
                  >
                    IMAP (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProtocolChange("POP3")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                      formData.incomingProtocol === "POP3" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                    )}
                  >
                    POP3
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold">Incoming Server Host *</Label>
                  <Input
                    required
                    placeholder="imap.mailserver.com"
                    value={formData.incomingHost}
                    onChange={(e) => setFormData((prev) => ({ ...prev, incomingHost: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Port</Label>
                  <Input
                    type="number"
                    value={formData.incomingPort}
                    onChange={(e) => setFormData((prev) => ({ ...prev, incomingPort: Number(e.target.value) }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Security Encryption</Label>
                  <Select
                    value={formData.incomingSecurity}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, incomingSecurity: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SSL/TLS">SSL / TLS (Encrypted Port 993/995)</SelectItem>
                      <SelectItem value="STARTTLS">STARTTLS (Opportunistic TLS)</SelectItem>
                      <SelectItem value="None">None / Plain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold">
                      Incoming Password {formData.id ? "(Leave blank to keep)" : "*"}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowIncomingPass(!showIncomingPass)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {showIncomingPass ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                      {showIncomingPass ? "Hide" : "Show"}
                    </button>
                  </div>
                  <Input
                    type={showIncomingPass ? "text" : "password"}
                    required={!formData.id}
                    placeholder={formData.id ? "•••••••••••• (Encrypted on Server)" : "Password or App Password"}
                    value={formData.incomingPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, incomingPassword: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Outgoing SMTP Server Section */}
            <div className="p-3.5 rounded-xl border bg-card space-y-3">
              <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                <Send className="size-3.5 text-indigo-600" />
                Outgoing SMTP Mail Server
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold">SMTP Host *</Label>
                  <Input
                    required
                    placeholder="smtp.mailserver.com"
                    value={formData.smtpHost}
                    onChange={(e) => setFormData((prev) => ({ ...prev, smtpHost: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Port</Label>
                  <Input
                    type="number"
                    value={formData.smtpPort}
                    onChange={(e) => setFormData((prev) => ({ ...prev, smtpPort: Number(e.target.value) }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Security</Label>
                  <Select
                    value={formData.smtpSecurity}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, smtpSecurity: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SSL/TLS">SSL / TLS (Port 465)</SelectItem>
                      <SelectItem value="STARTTLS">STARTTLS (Port 587)</SelectItem>
                      <SelectItem value="None">None / Plain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">SMTP Username</Label>
                  <Input
                    placeholder="Username or Email"
                    value={formData.smtpUser}
                    onChange={(e) => setFormData((prev) => ({ ...prev, smtpUser: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold">
                      SMTP Password {formData.id ? "(Blank to keep)" : "*"}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {showSmtpPass ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                      {showSmtpPass ? "Hide" : "Show"}
                    </button>
                  </div>
                  <Input
                    type={showSmtpPass ? "text" : "password"}
                    required={!formData.id}
                    placeholder={formData.id ? "•••••••••••• (Encrypted on Server)" : "SMTP Password"}
                    value={formData.smtpPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, smtpPassword: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Default Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefaultAccount"
                checked={formData.isDefault}
                onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                className="rounded border-gray-300 text-primary focus:ring-primary size-4"
              />
              <Label htmlFor="isDefaultAccount" className="text-xs cursor-pointer">
                Set as default personal mailbox for reading and sending messages
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saveMutation.isPending} className="gap-2">
                {saveMutation.isPending && <RefreshCw className="size-3.5 animate-spin" />}
                {formData.id ? "Save Changes" : "Save & Encrypt Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Test Email Modal */}
      <Dialog open={isTestEmailModalOpen} onOpenChange={setIsTestEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Send className="size-4 text-primary" />
              Send Test Verification Email
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dispatches a live verification email through your configured SMTP server ({testEmailAccount?.email}) to ensure outbound mail delivery succeeds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Recipient Email Address *</Label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              A test email with subject <code className="bg-muted px-1 py-0.5 rounded font-mono">[MASTERHRMS Test] Email Account Verification</code> will be dispatched.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsTestEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendTestEmail}
              disabled={sendingTestMail || !testRecipient}
              className="gap-2"
            >
              {sendingTestMail ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              {sendingTestMail ? "Dispatching..." : "Send Verification Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
