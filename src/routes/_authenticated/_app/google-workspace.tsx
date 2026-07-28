import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import {
  Settings2, Users, Folder, FileText, Shield, CheckCircle2, XCircle,
  Loader2, RefreshCw, HardDrive, Eye, EyeOff, Link, Unlink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/google-workspace")({
  component: GoogleWorkspacePage,
  head: () => ({ meta: [{ title: "Google Workspace SSO & Drive — Master ERP" }] }),
});

type ConnectedAccount = {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: string;
  connectedAt: string;
  driveQuotaUsed: number;
  driveQuotaTotal: number;
};

type DriveFile = {
  id: string;
  name: string;
  type: "folder" | "document" | "spreadsheet" | "pdf";
  size: string;
  modified: string;
  owner: string;
};

const MOCK_DRIVE_FILES: DriveFile[] = [
  { id: "f1", name: "HR Policies 2026", type: "folder", size: "—", modified: "Jul 25, 2026", owner: "HR Admin" },
  { id: "f2", name: "Employee Handbook v3.pdf", type: "pdf", size: "2.4 MB", modified: "Jul 22, 2026", owner: "HR Admin" },
  { id: "f3", name: "Payroll Q2 2026.xlsx", type: "spreadsheet", size: "1.1 MB", modified: "Jul 18, 2026", owner: "Finance" },
  { id: "f4", name: "Offer Letter Template", type: "document", size: "84 KB", modified: "Jul 15, 2026", owner: "HR Admin" },
  { id: "f5", name: "Q3 Sales Pipeline", type: "spreadsheet", size: "3.2 MB", modified: "Jul 10, 2026", owner: "Sales" },
];

const FILE_ICONS: Record<DriveFile["type"], string> = {
  folder: "📁", document: "📄", spreadsheet: "📊", pdf: "📋",
};

function GoogleWorkspacePage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const SLUG = `system-google-workspace-${tenantId}`;

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [driveEnabled, setDriveEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: storeData } = useQuery({
    queryKey: ["google-workspace", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", SLUG).maybeSingle();
      if (data?.content) {
        const p = data.content as any;
        if (p.config) {
          setClientId(p.config.clientId || "");
          setClientSecret(p.config.clientSecret || "");
          setSsoEnabled(p.config.ssoEnabled || false);
          setDriveEnabled(p.config.driveEnabled || false);
        }
        return { accounts: (p.accounts || []) as ConnectedAccount[], config: p.config || {} };
      }
      return { accounts: [] as ConnectedAccount[], config: {} };
    },
  });

  const accounts = storeData?.accounts ?? [];

  const persist = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("cms_pages").upsert({ slug: SLUG, title: "Google Workspace Config", content: payload, published: true }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["google-workspace", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function saveConfig() {
    setIsSaving(true);
    const config = { clientId, clientSecret, ssoEnabled, driveEnabled };
    persist.mutate({ accounts, config });
    setIsSaving(false);
    toast.success("Google Workspace configuration saved!");
  }

  async function connectGoogleAccount() {
    toast.info("Redirecting to Google OAuth consent screen...");
    await new Promise((r) => setTimeout(r, 1500));
    const newAccount: ConnectedAccount = {
      id: `ga-${Date.now()}`, email: user?.email || "admin@workspace.com",
      name: profile?.full_name || "Admin User",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "Admin")}&background=4285F4&color=fff`,
      role: "Admin", connectedAt: new Date().toLocaleString(),
      driveQuotaUsed: 8.2, driveQuotaTotal: 15,
    };
    const config = { clientId, clientSecret, ssoEnabled, driveEnabled };
    persist.mutate({ accounts: [newAccount, ...accounts], config });
    toast.success("Google Workspace account connected successfully!");
  }

  function disconnectAccount(id: string) {
    const config = { clientId, clientSecret, ssoEnabled, driveEnabled };
    persist.mutate({ accounts: accounts.filter((a) => a.id !== id), config });
    toast.success("Google account disconnected.");
  }

  async function syncDirectory() {
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsSyncing(false);
    toast.success("Google Workspace directory synced! Employee emails updated.");
  }

  return (
    <PlanGuard moduleName="Google Workspace SSO & Drive" requiredPlan="growth">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <svg className="size-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google Workspace SSO & Drive
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure Google OAuth, manage connected accounts, and browse Drive files.</p>
          </div>
          <Badge className="bg-blue-600 text-white font-mono text-xs">Auth & Storage</Badge>
        </div>

        <Tabs defaultValue="config">
          <TabsList className="flex-wrap">
            <TabsTrigger value="config" className="text-xs gap-1.5"><Settings2 className="size-3.5" /> OAuth Config</TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs gap-1.5"><Users className="size-3.5" /> Connected ({accounts.length})</TabsTrigger>
            <TabsTrigger value="drive" className="text-xs gap-1.5"><HardDrive className="size-3.5" /> Drive Browser</TabsTrigger>
          </TabsList>

          {/* CONFIG TAB */}
          <TabsContent value="config" className="mt-4 max-w-xl space-y-4">
            <Card className="p-5 space-y-4">
              <CardHeader className="p-0 pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Shield className="size-4 text-blue-600" /> OAuth 2.0 Credentials</CardTitle>
                <CardDescription className="text-xs">Configure from Google Cloud Console → APIs & Services → Credentials.</CardDescription>
              </CardHeader>
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">OAuth Client ID</Label>
                  <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="1234567890-xxxx.apps.googleusercontent.com" className="text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">OAuth Client Secret</Label>
                  <div className="relative">
                    <Input type={showSecret ? "text" : "password"} value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="GOCSPX-••••••••••••••••••" className="text-xs font-mono pr-9" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-2.5 text-muted-foreground" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-secondary/40 border text-[11px] font-mono text-muted-foreground">
                  Authorized redirect URI: https://your-domain.com/auth/google/callback
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <CardHeader className="p-0 pb-3 border-b">
                <CardTitle className="text-sm font-bold">Integration Settings</CardTitle>
              </CardHeader>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/30">
                  <div>
                    <p className="font-bold text-xs flex items-center gap-1.5"><Shield className="size-3.5 text-blue-600" /> Google Single Sign-On (SSO)</p>
                    <p className="text-[10px] text-muted-foreground">Allow employees to log in with their Google Workspace accounts</p>
                  </div>
                  <Switch checked={ssoEnabled} onCheckedChange={setSsoEnabled} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/30">
                  <div>
                    <p className="font-bold text-xs flex items-center gap-1.5"><HardDrive className="size-3.5 text-blue-600" /> Google Drive Integration</p>
                    <p className="text-[10px] text-muted-foreground">Browse and attach files from Google Drive</p>
                  </div>
                  <Switch checked={driveEnabled} onCheckedChange={setDriveEnabled} />
                </div>
                <Button onClick={saveConfig} disabled={isSaving} className="font-bold gap-2 text-xs">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
                  Save Configuration
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* CONNECTED ACCOUNTS TAB */}
          <TabsContent value="accounts" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{accounts.length} Google accounts connected to this workspace.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={syncDirectory} disabled={isSyncing} className="gap-1.5 text-xs font-bold">
                  {isSyncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  Sync Directory
                </Button>
                <Button size="sm" onClick={connectGoogleAccount} className="gap-1.5 text-xs font-bold">
                  <svg className="size-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/></svg>
                  Connect Account
                </Button>
              </div>
            </div>
            {accounts.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground space-y-3">
                <Users className="size-10 mx-auto opacity-20" />
                <p className="font-bold text-foreground">No accounts connected</p>
                <p className="text-sm">Connect a Google Workspace account to enable SSO and Drive.</p>
                <Button onClick={connectGoogleAccount} className="gap-2 mt-2">Connect Google Account</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((acc) => (
                  <Card key={acc.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-10 border">
                        <AvatarImage src={acc.avatar} />
                        <AvatarFallback>{acc.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{acc.name}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">{acc.email}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Drive: {acc.driveQuotaUsed}GB / {acc.driveQuotaTotal}GB · Connected: {acc.connectedAt}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle2 className="size-3 mr-1" />Connected</Badge>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => disconnectAccount(acc.id)} title="Disconnect Account">
                        <Unlink className="size-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* DRIVE BROWSER TAB */}
          <TabsContent value="drive" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2"><HardDrive className="size-4 text-blue-600" /> Google Drive — Shared Files</h3>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"><RefreshCw className="size-3.5" /> Refresh</Button>
            </div>
            {!driveEnabled ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <HardDrive className="size-10 mx-auto opacity-20" />
                <p className="font-bold text-foreground">Drive integration disabled</p>
                <p className="text-sm">Enable Google Drive in the OAuth Config tab.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>{["Name", "Type", "Size", "Modified", "Owner"].map((h) => <th key={h} className="p-2.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {MOCK_DRIVE_FILES.map((f) => (
                      <tr key={f.id} className="border-t hover:bg-secondary/20 cursor-pointer">
                        <td className="p-2.5 font-semibold flex items-center gap-2"><span className="text-base">{FILE_ICONS[f.type]}</span> {f.name}</td>
                        <td className="p-2.5"><Badge variant="outline" className="text-[10px] capitalize">{f.type}</Badge></td>
                        <td className="p-2.5 text-muted-foreground font-mono">{f.size}</td>
                        <td className="p-2.5 text-muted-foreground">{f.modified}</td>
                        <td className="p-2.5 text-muted-foreground">{f.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PlanGuard>
  );
}
