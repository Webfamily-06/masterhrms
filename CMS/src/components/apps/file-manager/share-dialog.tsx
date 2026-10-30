"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  Shield,
  Clock,
  Lock,
  Globe,
  Loader2,
  Building,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FileItem } from "./unified-file-manager";

const SYSTEM_FONT_STACK =
  "var(--font-sans), 'Public Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileItem: FileItem | null;
  onAclChanged?: () => void;
}

interface PrincipalResult {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  type: "USER" | "TEAM" | "DEPARTMENT" | "ROLE";
}

export function ShareDialog({
  open,
  onOpenChange,
  fileItem,
  onAclChanged,
}: ShareDialogProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("internal");

  // Internal Share Form State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrincipal, setSelectedPrincipal] = useState<PrincipalResult | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<"VIEWER" | "EDITOR" | "MANAGER">("VIEWER");
  const [shareMessage, setShareMessage] = useState("");
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);

  // Public Link Form State
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [linkPassword, setLinkPassword] = useState("");
  const [linkExpiryDays, setLinkExpiryDays] = useState<string>("7");
  const [allowDownload, setAllowDownload] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedPublicToken, setGeneratedPublicToken] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isRevokingLink, setIsRevokingLink] = useState(false);

  // 1. Fetch Active ACLs
  const {
    data: aclData,
    isLoading: isLoadingAcls,
    refetch: refetchAcls,
  } = useQuery({
    queryKey: ["file-acls", fileItem?.id],
    queryFn: async () => {
      if (!fileItem?.id) return null;
      return await api.get(`/v1/files/${fileItem.id}/acls`);
    },
    enabled: open && Boolean(fileItem?.id),
  });

  // 2. Fetch Search Principals
  const { data: principalResults, isLoading: isSearchingPrincipals } = useQuery({
    queryKey: ["principals-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { users: [], teams: [], departments: [], roles: [] };
      return await api.get(`/v1/files/principals/search?q=${encodeURIComponent(searchQuery.trim())}`);
    },
    enabled: open && searchQuery.trim().length > 0,
  });

  // Check if public link exists in active ACLs
  const activePublicLinkAcl = aclData?.directAcls?.find((a: any) => a.isPublicLink);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedPrincipal(null);
      setSelectedPermission("VIEWER");
      setShareMessage("");
      setCopiedLink(false);
      setGeneratedPublicToken(null);
      setIsPasswordProtected(false);
      setLinkPassword("");
      setLinkExpiryDays("7");
      setAllowDownload(true);
    }
  }, [open]);

  // Handle Internal Grant
  const handleGrantAccess = async () => {
    if (!fileItem || !selectedPrincipal) return;
    setIsSubmittingGrant(true);
    try {
      await api.post(`/v1/files/${fileItem.id}/acls`, {
        principalType: selectedPrincipal.type,
        principalId: selectedPrincipal.id,
        permission: selectedPermission,
        inherit: true,
        message: shareMessage.trim() || undefined,
      });

      toast.success(`Access granted to ${selectedPrincipal.name} as ${selectedPermission}`);
      setSelectedPrincipal(null);
      setSearchQuery("");
      setShareMessage("");
      refetchAcls();
      qc.invalidateQueries({ queryKey: ["files-list"] });
      if (onAclChanged) onAclChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to grant access.");
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  // Handle Revoke ACL
  const handleRevokeAcl = async (aclId: string, principalName: string) => {
    if (!fileItem) return;
    try {
      await api.delete(`/v1/files/${fileItem.id}/acls/${aclId}`);
      toast.success(`Removed access for ${principalName}`);
      refetchAcls();
      qc.invalidateQueries({ queryKey: ["files-list"] });
      if (onAclChanged) onAclChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke access.");
    }
  };

  // Handle Create Public Link
  const handleCreatePublicLink = async () => {
    if (!fileItem) return;
    setIsGeneratingLink(true);
    try {
      let expiresAt: string | null = null;
      if (linkExpiryDays !== "never") {
        const days = parseInt(linkExpiryDays, 10);
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const res = await api.post(`/v1/files/${fileItem.id}/public-link`, {
        password: isPasswordProtected ? linkPassword : undefined,
        expiresAt,
        allowDownload,
      });

      setGeneratedPublicToken(res.token);
      toast.success("Secure public link created successfully!");
      refetchAcls();
      qc.invalidateQueries({ queryKey: ["files-list"] });
      if (onAclChanged) onAclChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to create public link.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Handle Revoke Public Link
  const handleRevokePublicLink = async () => {
    if (!fileItem) return;
    setIsRevokingLink(true);
    try {
      await api.delete(`/v1/files/${fileItem.id}/public-link`);
      setGeneratedPublicToken(null);
      toast.success("Public link revoked. File is no longer accessible externally.");
      refetchAcls();
      qc.invalidateQueries({ queryKey: ["files-list"] });
      if (onAclChanged) onAclChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke public link.");
    } finally {
      setIsRevokingLink(false);
    }
  };

  const fullPublicUrl = generatedPublicToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${generatedPublicToken}`
    : null;

  const handleCopyLink = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ fontFamily: SYSTEM_FONT_STACK }}
        className="sm:max-w-xl font-sans p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="p-4 border-b border-border/80 bg-card/60">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">Share "{fileItem?.fileName}"</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Manage internal collaborator access and secure public links.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 pt-3 border-b border-border/60 bg-muted/20">
            <TabsList className="h-8 p-0.5 bg-muted/60 text-xs">
              <TabsTrigger value="internal" className="h-7 text-xs gap-1.5 px-3">
                <Users className="size-3.5" />
                <span>Internal Collaborators</span>
              </TabsTrigger>
              <TabsTrigger value="public" className="h-7 text-xs gap-1.5 px-3">
                <Globe className="size-3.5" />
                <span>Public Link</span>
                {activePublicLinkAcl && (
                  <span className="size-1.5 rounded-full bg-emerald-500 ml-1 inline-block" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: INTERNAL COLLABORATION */}
          <TabsContent value="internal" className="p-4 space-y-4 m-0">
            {/* Principal Search & Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Add people, teams, or departments</Label>
              <div className="relative">
                <Input
                  placeholder="Type name, email, department, or team..."
                  value={selectedPrincipal ? selectedPrincipal.name : searchQuery}
                  onChange={(e) => {
                    setSelectedPrincipal(null);
                    setSearchQuery(e.target.value);
                  }}
                  className="text-xs h-9"
                  disabled={Boolean(selectedPrincipal)}
                />
                {selectedPrincipal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSelectedPrincipal(null);
                      setSearchQuery("");
                    }}
                  >
                    Change
                  </Button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {!selectedPrincipal && searchQuery.trim().length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md text-xs space-y-1">
                  {isSearchingPrincipals ? (
                    <div className="p-3 text-center text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" /> Searching...
                    </div>
                  ) : (
                    <>
                      {/* Users */}
                      {principalResults?.users?.map((u: any) => (
                        <div
                          key={`user-${u.id}`}
                          onClick={() => setSelectedPrincipal(u)}
                          className="flex items-center gap-2.5 p-2 rounded hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-[10px]">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate flex-1">
                            <div className="font-medium text-foreground">{u.name}</div>
                            <div className="text-[10px] text-muted-foreground">{u.email}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5">User</Badge>
                        </div>
                      ))}

                      {/* Teams */}
                      {principalResults?.teams?.map((t: any) => (
                        <div
                          key={`team-${t.id}`}
                          onClick={() => setSelectedPrincipal(t)}
                          className="flex items-center gap-2.5 p-2 rounded hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="size-6 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <Users className="size-3" />
                          </div>
                          <div className="truncate flex-1">
                            <div className="font-medium text-foreground">{t.name}</div>
                            {t.description && <div className="text-[10px] text-muted-foreground">{t.description}</div>}
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/5 text-blue-600 border-blue-200">Team</Badge>
                        </div>
                      ))}

                      {/* Departments */}
                      {principalResults?.departments?.map((d: any) => (
                        <div
                          key={`dept-${d.id}`}
                          onClick={() => setSelectedPrincipal(d)}
                          className="flex items-center gap-2.5 p-2 rounded hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="size-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <Building className="size-3" />
                          </div>
                          <div className="truncate flex-1">
                            <div className="font-medium text-foreground">{d.name}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/5 text-emerald-600 border-emerald-200">Department</Badge>
                        </div>
                      ))}

                      {/* Roles */}
                      {principalResults?.roles?.map((r: any) => (
                        <div
                          key={`role-${r.id}`}
                          onClick={() => setSelectedPrincipal(r)}
                          className="flex items-center gap-2.5 p-2 rounded hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="size-6 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <ShieldCheck className="size-3" />
                          </div>
                          <div className="truncate flex-1">
                            <div className="font-medium text-foreground">{r.name}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/5 text-amber-600 border-amber-200">Role</Badge>
                        </div>
                      ))}

                      {!principalResults?.users?.length &&
                        !principalResults?.teams?.length &&
                        !principalResults?.departments?.length &&
                        !principalResults?.roles?.length && (
                          <div className="p-3 text-center text-muted-foreground">No matching principals found.</div>
                        )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Role & Optional Message */}
            {selectedPrincipal && (
              <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-foreground">{selectedPrincipal.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{selectedPrincipal.type}</Badge>
                  </div>
                  <Select
                    value={selectedPermission}
                    onValueChange={(val: any) => setSelectedPermission(val)}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ fontFamily: SYSTEM_FONT_STACK }} className="text-xs">
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleGrantAccess}
                    disabled={isSubmittingGrant}
                  >
                    {isSubmittingGrant && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                    Share
                  </Button>
                </div>
              </div>
            )}

            {/* "Who Has Access" List */}
            <div className="space-y-2 pt-2 border-t border-border/80">
              <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Who has access
              </div>

              {isLoadingAcls ? (
                <div className="p-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" /> Loading access list...
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {/* File Owner */}
                  {aclData?.owner && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-border/50 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-[10px]">
                          {aclData.owner.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-foreground">{aclData.owner.name}</div>
                          <div className="text-[10px] text-muted-foreground">{aclData.owner.email}</div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Owner</Badge>
                    </div>
                  )}

                  {/* Direct ACL Grants */}
                  {aclData?.directAcls
                    ?.filter((a: any) => !a.isPublicLink)
                    .map((acl: any) => (
                      <div
                        key={acl.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border/60 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="size-6 rounded-full bg-muted flex items-center justify-center font-medium text-[10px]">
                            {acl.principalType === "TEAM" ? (
                              <Users className="size-3 text-blue-600" />
                            ) : acl.principalType === "DEPARTMENT" ? (
                              <Building className="size-3 text-emerald-600" />
                            ) : (
                              <UserCheck className="size-3 text-primary" />
                            )}
                          </div>
                          <div className="truncate">
                            <div className="font-medium text-foreground">{acl.principalName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {acl.principalEmail || acl.principalType}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {acl.permission.toLowerCase()}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRevokeAcl(acl.id, acl.principalName)}
                            title="Remove access"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                  {/* Inherited ACL Grants */}
                  {aclData?.inheritedAcls?.map((iAcl: any) => (
                    <div
                      key={`inherited-${iAcl.id}`}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/20 border border-border/40 text-xs opacity-75"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Users className="size-3.5 text-muted-foreground" />
                        <div className="truncate">
                          <span className="font-medium">{iAcl.principalId || iAcl.principalType}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            (Inherited from "{iAcl.inheritedFromFolderName}")
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {iAcl.permission.toLowerCase()}
                      </Badge>
                    </div>
                  ))}

                  {!aclData?.directAcls?.length && !aclData?.inheritedAcls?.length && (
                    <div className="p-3 text-center text-muted-foreground text-xs">
                      Only the file owner has access to this item.
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: PUBLIC LINK */}
          <TabsContent value="public" className="p-4 space-y-4 m-0">
            {activePublicLinkAcl || generatedPublicToken ? (
              /* Public Link Active State */
              <div className="space-y-4">
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium text-xs">
                    <Globe className="size-4 shrink-0" />
                    <span>Public link is active and accessible via unguessable token.</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-300">
                    Active
                  </Badge>
                </div>

                {/* Copy Link Input Box */}
                {fullPublicUrl && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Public URL</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={fullPublicUrl}
                        className="text-xs h-9 font-mono bg-muted/40"
                      />
                      <Button
                        size="sm"
                        className="h-9 px-3 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                        onClick={() => handleCopyLink(fullPublicUrl)}
                      >
                        {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        <span>{copiedLink ? "Copied" : "Copy"}</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Revoke Button */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Revoking immediately disables external access and returns 404.
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleRevokePublicLink}
                    disabled={isRevokingLink}
                  >
                    {isRevokingLink && <Loader2 className="size-3 animate-spin" />}
                    <Trash2 className="size-3.5" />
                    <span>Revoke Link</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Create Public Link Form */
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  Generate an unguessable 64-character token link to share this file outside your organization.
                  Tokens are hashed with SHA-256 for maximum security.
                </div>

                {/* Expiry Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Link Expiry</Label>
                  <Select value={linkExpiryDays} onValueChange={setLinkExpiryDays}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ fontFamily: SYSTEM_FONT_STACK }} className="text-xs">
                      <SelectItem value="1">Expires in 24 hours</SelectItem>
                      <SelectItem value="7">Expires in 7 days</SelectItem>
                      <SelectItem value="30">Expires in 30 days</SelectItem>
                      <SelectItem value="never">Never expires</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Password Protection */}
                <div className="space-y-2 pt-1 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="enable-password"
                      checked={isPasswordProtected}
                      onCheckedChange={(checked) => setIsPasswordProtected(Boolean(checked))}
                    />
                    <Label htmlFor="enable-password" className="text-xs font-medium cursor-pointer">
                      Protect link with a password
                    </Label>
                  </div>

                  {isPasswordProtected && (
                    <div className="pl-6 space-y-1">
                      <Input
                        type="password"
                        placeholder="Enter link password..."
                        value={linkPassword}
                        onChange={(e) => setLinkPassword(e.target.value)}
                        className="text-xs h-9"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Visitors must enter this password before viewing or downloading the file.
                      </p>
                    </div>
                  )}
                </div>

                {/* Allow Download */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                  <Checkbox
                    id="allow-download"
                    checked={allowDownload}
                    onCheckedChange={(checked) => setAllowDownload(Boolean(checked))}
                  />
                  <Label htmlFor="allow-download" className="text-xs font-medium cursor-pointer">
                    Allow direct file download (uncheck for view-only mode)
                  </Label>
                </div>

                <DialogFooter className="pt-3 border-t border-border">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                    onClick={handleCreatePublicLink}
                    disabled={isGeneratingLink || (isPasswordProtected && !linkPassword.trim())}
                  >
                    {isGeneratingLink && <Loader2 className="size-3 animate-spin" />}
                    <Globe className="size-3.5" />
                    <span>Create Public Link</span>
                  </Button>
                </DialogFooter>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

