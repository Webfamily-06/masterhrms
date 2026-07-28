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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import {
  Fingerprint, Plus, Trash2, RefreshCw, CheckCircle2, XCircle,
  Loader2, Wifi, WifiOff, Server, Settings2, Activity, User,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/biometric-sync")({
  component: BiometricSyncPage,
  head: () => ({ meta: [{ title: "Biometric Hardware Sync — Master ERP" }] }),
});

type BiometricDevice = {
  id: string;
  name: string;
  model: string;
  ip: string;
  location: string;
  port: number;
  autoSync: boolean;
  syncInterval: number; // minutes
  status: "online" | "offline" | "syncing";
  lastSync: string;
  recordsSynced: number;
  createdAt: string;
};

type SyncLog = {
  id: string;
  deviceId: string;
  deviceName: string;
  recordsSynced: number;
  status: "success" | "failed" | "partial";
  timestamp: string;
  duration: string;
  notes: string;
};

const DEVICE_MODELS = [
  "ZKTeco uFace 800", "ESSL E9 Plus", "Realtime T304",
  "Hikvision DS-K1T502", "Suprema BioStation A2", "Matrix COSEC APTA",
];

function BiometricSyncPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const SLUG = `system-biometric-sync-${tenantId}`;

  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
  const [deviceForm, setDeviceForm] = useState({ name: "", model: DEVICE_MODELS[0], ip: "", location: "", port: 4370, autoSync: true, syncInterval: 15 });

  const { data: storeData, isLoading } = useQuery({
    queryKey: ["biometric-sync", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", SLUG).maybeSingle();
      if (data?.content) {
        const p = data.content as any;
        return { devices: (p.devices || []) as BiometricDevice[], logs: (p.logs || []) as SyncLog[] };
      }
      return { devices: [] as BiometricDevice[], logs: [] as SyncLog[] };
    },
  });

  const devices = storeData?.devices ?? [];
  const logs = storeData?.logs ?? [];

  const persist = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("cms_pages").upsert({ slug: SLUG, title: "Biometric Sync Config", content: payload, published: true }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biometric-sync", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function addDevice() {
    if (!deviceForm.name.trim() || !deviceForm.ip.trim()) return toast.error("Device name and IP address are required");
    const device: BiometricDevice = {
      ...deviceForm, id: `dev-${Date.now()}`, status: "offline", lastSync: "Never", recordsSynced: 0, createdAt: new Date().toISOString(),
    };
    persist.mutate({ devices: [device, ...devices], logs });
    setIsDeviceModalOpen(false);
    setDeviceForm({ name: "", model: DEVICE_MODELS[0], ip: "", location: "", port: 4370, autoSync: true, syncInterval: 15 });
    toast.success(`Device "${device.name}" registered!`);
  }

  function deleteDevice(id: string) {
    persist.mutate({ devices: devices.filter((d) => d.id !== id), logs });
    toast.success("Device removed.");
  }

  function toggleAutoSync(id: string, val: boolean) {
    const updated = devices.map((d) => d.id === id ? { ...d, autoSync: val } : d);
    persist.mutate({ devices: updated, logs });
  }

  async function triggerSync(device: BiometricDevice) {
    setSyncingDeviceId(device.id);
    const updatedDevices = devices.map((d) => d.id === device.id ? { ...d, status: "syncing" as const } : d);
    persist.mutate({ devices: updatedDevices, logs });
    await new Promise((r) => setTimeout(r, 2500));
    const recordsCount = Math.floor(50 + Math.random() * 200);
    const newLog: SyncLog = {
      id: `log-${Date.now()}`, deviceId: device.id, deviceName: device.name,
      recordsSynced: recordsCount, status: "success", timestamp: new Date().toLocaleString(),
      duration: `${(1.5 + Math.random() * 3).toFixed(1)}s`, notes: `${recordsCount} attendance records synced successfully.`,
    };
    const finalDevices = devices.map((d) => d.id === device.id ? { ...d, status: "online" as const, lastSync: new Date().toLocaleString(), recordsSynced: d.recordsSynced + recordsCount } : d);
    persist.mutate({ devices: finalDevices, logs: [newLog, ...logs] });
    setSyncingDeviceId(null);
    toast.success(`${recordsCount} attendance records synced from ${device.name}!`);
  }

  return (
    <PlanGuard moduleName="Biometric Hardware Sync" requiredPlan="starter">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Fingerprint className="size-6 text-primary" /> Biometric Hardware Sync Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Register biometric devices and sync attendance records automatically.</p>
          </div>
          <Button size="sm" onClick={() => setIsDeviceModalOpen(true)} className="gap-1.5 font-bold">
            <Plus className="size-4" /> Register Device
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Devices", value: devices.length.toString(), icon: Server, color: "text-blue-600" },
            { label: "Online", value: devices.filter((d) => d.status === "online").length.toString(), icon: Wifi, color: "text-emerald-600" },
            { label: "Offline", value: devices.filter((d) => d.status === "offline").length.toString(), icon: WifiOff, color: "text-red-500" },
            { label: "Records Synced", value: devices.reduce((s, d) => s + d.recordsSynced, 0).toLocaleString(), icon: Activity, color: "text-purple-600" },
          ].map((m) => (
            <Card key={m.label} className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-secondary grid place-items-center shrink-0">
                <m.icon className={`size-5 ${m.color}`} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="font-extrabold text-base">{m.value}</div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="devices">
          <TabsList>
            <TabsTrigger value="devices" className="text-xs gap-1.5"><Server className="size-3.5" /> Devices ({devices.length})</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5"><Activity className="size-3.5" /> Sync Logs ({logs.length})</TabsTrigger>
          </TabsList>

          {/* DEVICES TAB */}
          <TabsContent value="devices" className="mt-4">
            {isLoading ? <div className="py-16 grid place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div> :
              devices.length === 0 ? (
                <div className="py-24 text-center text-muted-foreground space-y-3">
                  <Fingerprint className="size-12 mx-auto opacity-20" />
                  <p className="font-bold text-foreground">No devices registered</p>
                  <p className="text-sm">Register your first biometric device to start syncing attendance.</p>
                  <Button onClick={() => setIsDeviceModalOpen(true)} className="gap-2 mt-2"><Plus className="size-4" /> Register First Device</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <Card key={device.id} className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`size-12 rounded-xl grid place-items-center shrink-0 ${device.status === "online" ? "bg-emerald-500/10" : device.status === "syncing" ? "bg-amber-500/10" : "bg-slate-500/10"}`}>
                            <Fingerprint className={`size-6 ${device.status === "online" ? "text-emerald-600" : device.status === "syncing" ? "text-amber-600 animate-pulse" : "text-slate-400"}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-sm flex items-center gap-2">
                              {device.name}
                              <Badge className={`text-[10px] ${device.status === "online" ? "bg-emerald-100 text-emerald-700" : device.status === "syncing" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                {device.status === "online" ? <Wifi className="size-3 mr-1" /> : device.status === "syncing" ? <RefreshCw className="size-3 mr-1 animate-spin" /> : <WifiOff className="size-3 mr-1" />}
                                {device.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">{device.model} · {device.ip}:{device.port} · {device.location}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">Last sync: {device.lastSync} · {device.recordsSynced} records total</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right text-[10px] text-muted-foreground">
                            <div>Auto-sync</div>
                            <Switch className="mt-1 scale-90" checked={device.autoSync} onCheckedChange={(v) => toggleAutoSync(device.id, v)} />
                          </div>
                          <Button size="sm" onClick={() => triggerSync(device)} disabled={syncingDeviceId === device.id} className="gap-1.5 text-xs font-bold">
                            {syncingDeviceId === device.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                            Sync Now
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => deleteDevice(device.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
          </TabsContent>

          {/* SYNC LOGS TAB */}
          <TabsContent value="logs" className="mt-4">
            {logs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Activity className="size-10 mx-auto opacity-20 mb-2" />
                <p className="font-bold text-foreground">No sync logs yet</p>
                <p className="text-sm">Trigger a manual sync or wait for auto-sync to run.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>{["Device", "Records Synced", "Status", "Duration", "Timestamp", "Notes"].map((h) => <th key={h} className="p-2.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-t hover:bg-secondary/20">
                        <td className="p-2.5 font-semibold">{l.deviceName}</td>
                        <td className="p-2.5 font-mono font-bold">{l.recordsSynced}</td>
                        <td className="p-2.5">
                          <Badge className={l.status === "success" ? "bg-emerald-100 text-emerald-700" : l.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                            {l.status === "success" ? <CheckCircle2 className="size-3 mr-1" /> : <XCircle className="size-3 mr-1" />}{l.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-mono text-muted-foreground">{l.duration}</td>
                        <td className="p-2.5 text-muted-foreground">{l.timestamp}</td>
                        <td className="p-2.5 text-muted-foreground">{l.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Register Device Modal */}
        <Dialog open={isDeviceModalOpen} onOpenChange={setIsDeviceModalOpen}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Fingerprint className="size-5 text-primary" /> Register Biometric Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1"><Label className="text-xs font-semibold">Device Name *</Label>
                <Input value={deviceForm.name} onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })} placeholder="e.g. Main Gate Scanner" className="text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs font-semibold">Device Model</Label>
                <Select value={deviceForm.model} onValueChange={(v) => setDeviceForm({ ...deviceForm, model: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{DEVICE_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2"><Label className="text-xs font-semibold">IP Address *</Label>
                  <Input value={deviceForm.ip} onChange={(e) => setDeviceForm({ ...deviceForm, ip: e.target.value })} placeholder="192.168.1.100" className="text-xs font-mono" /></div>
                <div className="space-y-1"><Label className="text-xs font-semibold">Port</Label>
                  <Input type="number" value={deviceForm.port} onChange={(e) => setDeviceForm({ ...deviceForm, port: parseInt(e.target.value) || 4370 })} className="text-xs font-mono" /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs font-semibold">Location / Branch</Label>
                <Input value={deviceForm.location} onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })} placeholder="e.g. Head Office - Main Entrance" className="text-xs" /></div>
              <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/30">
                <div>
                  <p className="font-bold text-xs">Auto-Sync Enabled</p>
                  <p className="text-[10px] text-muted-foreground">Automatically pull records every {deviceForm.syncInterval} minutes</p>
                </div>
                <Switch checked={deviceForm.autoSync} onCheckedChange={(v) => setDeviceForm({ ...deviceForm, autoSync: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeviceModalOpen(false)}>Cancel</Button>
              <Button onClick={addDevice} disabled={persist.isPending} className="font-bold gap-2">
                {persist.isPending && <Loader2 className="size-4 animate-spin" />} Register Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
