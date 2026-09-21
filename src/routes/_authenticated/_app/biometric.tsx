import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Cpu,
  Fingerprint,
  ScanFace,
  Radio,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Zap,
  Activity,
  Terminal,
  Server,
  ShieldCheck,
  Building2,
  Trash2,
  Key,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Globe,
  Network,
  Radar,
  HelpCircle,
  Calendar,
  Download,
  Database,
  Users,
  HardDrive,
  SlidersHorizontal,
  ExternalLink,
  UserCheck,
  UserPlus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/biometric")({
  component: BiometricPage,
  head: () => ({ meta: [{ title: "Biometric Device Sync & Attendance Hardware — Master HRMS" }] }),
});

export function BiometricPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modals & Passport
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isProbeOpen, setIsProbeOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isCloudConfigOpen, setIsCloudConfigOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [activePassportDevice, setActivePassportDevice] = useState<any>(null);
  const [passportTab, setPassportTab] = useState<"logs" | "hardware_users">("logs");
  const [passportPeriod, setPassportPeriod] = useState<"daily" | "weekly" | "monthly" | "all">("daily");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Forms
  const [registerForm, setRegisterForm] = useState({
    deviceName: "",
    deviceModel: "Universal Biometric Device",
    deviceType: "hybrid",
    purpose: "both",
    ipAddress: "",
    port: "4370",
    serialNumber: "",
    location: "Main Entrance",
    syncProtocol: "pull_tcp_ip",
    autoAttendanceSync: true,
  });

  const [probeForm, setProbeForm] = useState({
    ipAddress: "10.10.10.222",
    port: "4370",
    deviceName: "TSV GLOBAL SOLUTIONS PVT LTD",
    location: "Main Reception",
  });

  const [simulateForm, setSimulateForm] = useState({
    deviceId: "",
    employeeCode: "19",
    verificationMode: "fingerprint",
    punchType: "auto",
  });

  // Queries
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: devices = [], isLoading: isDevicesLoading } = useQuery({
    queryKey: ["biometric-devices", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/biometric/devices");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: cloudConfig } = useQuery({
    queryKey: ["biometric-cloud-config", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/biometric/cloud-config");
      } catch {
        return null;
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["biometric-summary", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/biometric/summary/stats");
      } catch {
        return { totalDevices: 0, onlineDevices: 0, todayPunchesCount: 0, unmatchedCount: 0 };
      }
    },
  });

  const { data: punchLogs = [], isLoading: isLogsLoading } = useQuery({
    queryKey: ["biometric-logs", tenantId, selectedDeviceFilter, searchQuery],
    queryFn: async () => {
      try {
        let url = `/biometric/logs?deviceId=${selectedDeviceFilter}`;
        if (searchQuery) url += `&employeeCode=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 8000,
  });

  // Machine Passport Query
  const { data: passportData, isLoading: isPassportLoading } = useQuery({
    queryKey: ["biometric-passport", activePassportDevice?.id, passportPeriod],
    enabled: !!activePassportDevice?.id,
    queryFn: async () => {
      try {
        return await api.get(`/biometric/devices/${activePassportDevice.id}/passport?period=${passportPeriod}`);
      } catch {
        return null;
      }
    },
  });

  // Hardware Users Scan Query
  const { data: hardwareUsersData, isLoading: isHardwareUsersLoading, refetch: refetchHardwareUsers } = useQuery({
    queryKey: ["biometric-hardware-users", activePassportDevice?.id],
    enabled: !!activePassportDevice?.id && passportTab === "hardware_users",
    queryFn: async () => {
      try {
        return await api.get(`/biometric/devices/${activePassportDevice.id}/hardware-users`);
      } catch {
        return { users: [], matchedCount: 0, unmatchedCount: 0, totalHardwareUsers: 0 };
      }
    },
  });

  // Mutations
  const registerDeviceMut = useMutation({
    mutationFn: async (payload: any) => api.post("/biometric/devices", payload),
    onSuccess: () => {
      toast.success("Biometric terminal registered successfully!");
      qc.invalidateQueries({ queryKey: ["biometric-devices"] });
      qc.invalidateQueries({ queryKey: ["biometric-summary"] });
      setIsRegisterOpen(false);
      resetRegisterForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to register device"),
  });

  const probeDeviceMut = useMutation({
    mutationFn: async (payload: any) => api.post("/biometric/probe", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Device discovered & connected!");
      qc.invalidateQueries({ queryKey: ["biometric-devices"] });
      qc.invalidateQueries({ queryKey: ["biometric-summary"] });
      setIsProbeOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Probe connection failed"),
  });

  const pingDeviceMut = useMutation({
    mutationFn: async (id: string) => api.post(`/biometric/devices/${id}/ping`),
    onSuccess: (res: any) => {
      toast.success(res.message || "Terminal connection active!");
      qc.invalidateQueries({ queryKey: ["biometric-devices"] });
      qc.invalidateQueries({ queryKey: ["biometric-passport"] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Hardware unreachable (Offline)");
      qc.invalidateQueries({ queryKey: ["biometric-devices"] });
    },
  });

  const applySyncMut = useMutation({
    mutationFn: async (payload: { deviceId: string; importUnmappedUsers: boolean; syncPunches: boolean }) =>
      api.post(`/biometric/devices/${payload.deviceId}/apply-sync`, {
        importUnmappedUsers: payload.importUnmappedUsers,
        syncPunches: payload.syncPunches,
      }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Hardware data applied and synchronized!");
      qc.invalidateQueries({ queryKey: ["biometric-devices"] });
      qc.invalidateQueries({ queryKey: ["biometric-passport"] });
      qc.invalidateQueries({ queryKey: ["biometric-hardware-users"] });
      qc.invalidateQueries({ queryKey: ["biometric-logs"] });
      qc.invalidateQueries({ queryKey: ["biometric-summary"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: any) => toast.error(e.message || "Hardware sync failed"),
  });

  const mapEmployeeMut = useMutation({
    mutationFn: async (payload: { deviceId: string; employeeId: string; biometricId: string }) =>
      api.post(`/biometric/devices/${payload.deviceId}/map-employee`, {
        employeeId: payload.employeeId,
        biometricId: payload.biometricId,
      }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Biometric ID successfully linked to employee!");
      qc.invalidateQueries({ queryKey: ["biometric-hardware-users"] });
      qc.invalidateQueries({ queryKey: ["biometric-passport"] });
      qc.invalidateQueries({ queryKey: ["biometric-logs"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to map employee"),
  });

  const deleteDeviceMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/biometric/devices/${id}`),
    onSuccess: () => {
      toast.success("Device removed");
      qc.invalidateQueries({ queryKey: ["biometric-devices"] });
      qc.invalidateQueries({ queryKey: ["biometric-summary"] });
      if (activePassportDevice) setActivePassportDevice(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete device"),
  });

  const updateDevicePurposeMut = useMutation({
    mutationFn: async ({ id, purpose }: { id: string; purpose: string }) =>
      api.put(`/biometric/devices/${id}`, { purpose }),
    onSuccess: () => {
      toast.success("Device terminal role updated successfully!");
      qc.invalidateQueries({ queryKey: ["biometric-devices"] });
      qc.invalidateQueries({ queryKey: ["biometric-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update terminal role"),
  });

  const simulatePunchMut = useMutation({
    mutationFn: async (payload: any) => api.post("/biometric/simulate", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Biometric punch processed & Attendance updated!");
      qc.invalidateQueries({ queryKey: ["biometric-logs"] });
      qc.invalidateQueries({ queryKey: ["biometric-devices"] });
      qc.invalidateQueries({ queryKey: ["biometric-summary"] });
      qc.invalidateQueries({ queryKey: ["biometric-passport"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
      setIsSimulateOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Simulation failed"),
  });

  function resetRegisterForm() {
    setRegisterForm({
      deviceName: "",
      deviceModel: "Universal Biometric Device",
      deviceType: "hybrid",
      purpose: "both",
      ipAddress: "",
      port: "4370",
      serialNumber: "",
      location: "Main Entrance",
      syncProtocol: "pull_tcp_ip",
      autoAttendanceSync: true,
    });
  }

  function copyToClipboard(text: string, fieldName: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2500);
  }

  function exportPassportCsv() {
    if (!passportData?.punchLogs || passportData.punchLogs.length === 0) {
      toast.error("No punch logs available to export.");
      return;
    }

    const headers = ["Punch Time (IST)", "Employee Code", "Employee Name", "Department", "Verification Mode", "Punch Type", "Status"];
    const rows = passportData.punchLogs.map((p: any) => [
      new Date(p.punchTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      p.employeeCode,
      p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : "Unmatched Staff",
      p.employee?.department?.name || "N/A",
      p.verificationMode,
      p.punchType,
      p.syncStatus,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activePassportDevice?.deviceName || "biometric"}_${passportPeriod}_punches.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance sheet exported as CSV!");
  }

  // Filtered hardware users
  const filteredHardwareUsers = (hardwareUsersData?.users || []).filter((u: any) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.biometricId?.toLowerCase().includes(q) ||
      u.matchedEmployee?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Fingerprint className="size-6 text-primary" /> Universal Biometric Hardware Sync & Cloud Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real hardware capture for ZKTeco, eSSL, Realtime, Hikvision & all biometric machines. Direct Port 4370 binary ZK protocol sync, ADMS cloud push, and automatic attendance calculation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCloudConfigOpen(true)}
            className="text-xs font-bold h-8 gap-1.5 border-primary/30 text-primary"
          >
            <Globe className="size-3.5" />
            <span>Cloud Setup Guide</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAgentModalOpen(true)}
            className="text-xs font-bold h-8 gap-1.5 border-emerald-500/30 text-emerald-600"
          >
            <Network className="size-3.5 text-emerald-600" />
            <span>24/7 LAN SDK Agent</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsProbeOpen(true)}
            className="text-xs font-bold h-8 gap-1.5"
          >
            <Radar className="size-3.5 text-blue-600" />
            <span>Auto-Probe Network Device</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetRegisterForm();
              setIsRegisterOpen(true);
            }}
            className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>Add Terminal</span>
          </Button>
        </div>
      </div>

      {/* ─── HARDWARE & TIMEZONE PASSPORT BANNER ─── */}
      <Card className="p-4 border shadow-2xs bg-gradient-to-r from-primary/5 via-blue-500/5 to-purple-500/5 border-primary/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Hardware TCP/UDP 4370 Live</Badge>
              <h2 className="text-sm font-black text-foreground">Direct Biometric Terminal Data Sync</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Connected to physical hardware terminal. Click on any machine card to open the <strong>Machine Enrolled Users Studio</strong>, verify all 45+ staff members, and sync raw punch records directly to the database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono bg-background text-primary border-primary/30">
              <Clock className="size-3 mr-1" /> Timezone: Asia/Kolkata (IST +05:30)
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded-lg border bg-background flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground block">ADMS / iClock Push URL</span>
              <span className="font-mono font-bold text-primary text-[11px] truncate">
                {cloudConfig?.admsPushUrl || "http://your-server:4000/iclock/cdata"}
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => copyToClipboard(cloudConfig?.admsPushUrl || "http://localhost:4000/iclock/cdata", "ADMS Push URL")}
              className="size-6 shrink-0"
            >
              {copiedField === "ADMS Push URL" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            </Button>
          </div>

          <div className="p-2 rounded-lg border bg-background flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground block">Server Port</span>
              <span className="font-mono font-bold text-foreground text-[11px]">
                {cloudConfig?.serverPort || 4000} (Standard HTTP/TCP)
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => copyToClipboard(String(cloudConfig?.serverPort || 4000), "Server Port")}
              className="size-6 shrink-0"
            >
              {copiedField === "Server Port" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            </Button>
          </div>

          <div className="p-2 rounded-lg border bg-background flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground block">Organization Tenant Key</span>
              <span className="font-mono font-bold text-foreground text-[11px] truncate">
                {tenantId || "default-workspace"}
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => copyToClipboard(tenantId || "default-workspace", "Tenant Key")}
              className="size-6 shrink-0"
            >
              {copiedField === "Tenant Key" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* Sneat Pro Biometric Terminals KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Active Terminals", value: `${summary?.totalDevices || devices.length} Connected`, desc: "Registered biometric machines", icon: Server, color: "text-primary bg-primary/10" },
          { title: "Online Status", value: `${summary?.onlineDevices || 0} / ${devices.length} Online`, desc: "Port 4370 TCP/UDP status", icon: Wifi, color: "text-[oklch(0.60_0.17_155)] bg-[oklch(0.60_0.17_155/0.10)]" },
          { title: "Today's Punches", value: `${summary?.todayPunchesCount || 0} Punches`, desc: "Real-time clock logs", icon: Activity, color: "text-[oklch(0.73_0.16_75)] bg-[oklch(0.73_0.16_75/0.10)]" },
          { title: "Auto-Sync Accuracy", value: summary?.unmatchedCount === 0 ? "100%" : `${summary?.unmatchedCount} Unmatched`, desc: "Database user mapping", icon: CheckCircle2, color: "text-[oklch(0.60_0.20_200)] bg-[oklch(0.60_0.20_200/0.10)]" },
        ].map((w) => (
          <Card key={w.title} className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">{w.title}</span>
                <h4 className="text-xl font-bold tracking-tight text-foreground">{w.value}</h4>
                <p className="text-[11px] text-muted-foreground font-mono">{w.desc}</p>
              </div>
              <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", w.color)}>
                <w.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── HARDWARE TERMINALS FLEET ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-wider flex items-center gap-2">
            <Cpu className="size-4 text-primary" /> Connected Terminals Fleet ({devices.length})
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (devices.length > 0) {
                  setSimulateForm({
                    deviceId: devices[0].id,
                    employeeCode: "19",
                    verificationMode: "fingerprint",
                    punchType: "auto",
                  });
                }
                setIsSimulateOpen(true);
              }}
              className="h-7 text-xs font-bold gap-1 border-primary/30 text-primary"
            >
              <Zap className="size-3" />
              <span>Simulate Punch (Test)</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => qc.invalidateQueries({ queryKey: ["biometric-devices"] })}
              className="h-7 text-[10px] text-muted-foreground gap-1"
            >
              <RefreshCw className="size-3" /> Refresh
            </Button>
          </div>
        </div>

        {isDevicesLoading ? (
          <Card className="p-8 text-center text-xs text-muted-foreground">Loading terminals...</Card>
        ) : devices.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground border-dashed">
            <Cpu className="size-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="font-bold text-foreground">No biometric hardware terminals registered yet.</p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-md mx-auto">
              Click <strong>"Auto-Probe Network Device"</strong> to discover your machine on `10.10.10.222:4370` automatically.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button size="sm" onClick={() => setIsProbeOpen(true)} className="text-xs font-bold gap-1">
                <Radar className="size-3.5" /> Auto-Probe Network Device
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsRegisterOpen(true)} className="text-xs font-bold">
                Add Manually
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {devices.map((dev: any) => {
              const isOnline = dev.status === "online";
              return (
                <Card
                  key={dev.id}
                  className="border shadow-2xs hover:shadow-md transition-all duration-200 bg-card overflow-hidden flex flex-col justify-between cursor-pointer group"
                  onClick={() => {
                    setActivePassportDevice(dev);
                    setPassportTab("logs");
                  }}
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge
                        className={`text-[9px] font-bold h-4.5 px-1.5 gap-1 ${
                          isOnline
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                        }`}
                      >
                        {isOnline ? <Wifi className="size-2.5" /> : <WifiOff className="size-2.5" />}
                        <span className="capitalize">{dev.status}</span>
                      </Badge>

                      <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
                        SN: {dev.serialNumber}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={`text-[9px] font-semibold h-4.5 px-1.5 gap-1 ${
                          dev.purpose === "check_in_only"
                            ? "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400"
                            : dev.purpose === "check_out_only"
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400"
                            : "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-400"
                        }`}
                      >
                        {dev.purpose === "check_in_only"
                          ? "Entrance (In Only)"
                          : dev.purpose === "check_out_only"
                          ? "Exit (Out Only)"
                          : "Dual (In & Out)"}
                      </Badge>
                    </div>

                    <CardTitle className="text-sm font-black text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                      <span className="truncate">{dev.deviceName}</span>
                      <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="size-3 text-primary" />
                      <span>{dev.location}</span>
                      <span>·</span>
                      <span className="font-mono">{dev.deviceModel}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 border-t bg-muted/10 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg border bg-background space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">IP & Port</span>
                        <span className="font-mono font-bold text-foreground text-[11px]">
                          {dev.ipAddress || "Cloud Push"}:{dev.port}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg border bg-background space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">Total Punches</span>
                        <span className="font-mono font-bold text-primary text-[11px]">
                          {dev.totalPunchLogs || dev._count?.punchLogs || 0} Punches
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Last Seen: {dev.lastSyncAt ? new Date(dev.lastSyncAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) : "Never"}</span>
                      <span>Protocol: {dev.syncProtocol}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePassportDevice(dev);
                          setPassportTab("hardware_users");
                        }}
                        className="h-6 text-[10px] font-bold gap-1 flex-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white"
                      >
                        <Users className="size-3" /> Machine Users & Sync
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          pingDeviceMut.mutate(dev.id);
                        }}
                        disabled={pingDeviceMut.isPending}
                        className="h-6 text-[10px] font-bold gap-1"
                      >
                        <Activity className="size-3 text-emerald-600" /> Ping
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove biometric device "${dev.deviceName}"?`)) {
                            deleteDeviceMut.mutate(dev.id);
                          }
                        }}
                        className="size-6 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── LIVE PUNCH LOGS STREAM ─── */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2 rounded-xl border">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee code, name..."
                className="h-7 text-xs pl-8 w-48 sm:w-60 bg-background"
              />
            </div>

            <Select value={selectedDeviceFilter} onValueChange={setSelectedDeviceFilter}>
              <SelectTrigger className="h-7 text-xs w-48 bg-background">
                <SelectValue placeholder="All Terminals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terminals</SelectItem>
                {devices.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.deviceName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono gap-1">
            <Activity className="size-3" /> Live Punch Stream (Auto-Refreshes)
          </Badge>
        </div>

        <Card className="border shadow-2xs">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="text-xs">Punch Timestamp (IST)</TableHead>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Terminal Device</TableHead>
                  <TableHead className="text-xs">Verification Mode</TableHead>
                  <TableHead className="text-xs">Punch Type</TableHead>
                  <TableHead className="text-xs text-right">Attendance Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLogsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12 text-xs">
                      Loading punch logs...
                    </TableCell>
                  </TableRow>
                ) : punchLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12 text-xs italic">
                      No punch records found. Connect a machine or click "Machine Users & Sync" to pull real data.
                    </TableCell>
                  </TableRow>
                ) : (
                  punchLogs.map((log: any) => (
                    <TableRow key={log.id} className="text-xs hover:bg-muted/20">
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {new Date(log.punchTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        <span className="text-[10px] text-muted-foreground block font-normal">
                          {new Date(log.punchTime).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </span>
                      </TableCell>

                      <TableCell>
                        {log.employee ? (
                          <div>
                            <span className="font-bold text-foreground block">
                              {log.employee.firstName} {log.employee.lastName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {log.employeeCode} · {log.employee.department?.name || "General"}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-rose-600 block">Unmatched Staff</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Machine ID: {log.employeeCode}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-muted-foreground text-xs">
                        <span className="font-medium text-foreground block">{log.device?.deviceName || "Terminal"}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{log.device?.location}</span>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-medium capitalize gap-1 bg-muted/40">
                          {log.verificationMode === "face" ? (
                            <ScanFace className="size-3 text-purple-600" />
                          ) : log.verificationMode === "rfid" ? (
                            <Radio className="size-3 text-blue-600" />
                          ) : (
                            <Fingerprint className="size-3 text-primary" />
                          )}
                          <span>{log.verificationMode}</span>
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] font-mono capitalize">
                          {log.punchType}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {log.syncStatus === "processed" ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1 shadow-2xs">
                            <CheckCircle2 className="size-3" /> Synced
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                            Unmatched
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ─── DRAWER / MODAL: MACHINE PASSPORT & ENROLLED USERS STUDIO ─── */}
      {activePassportDevice && (
        <Dialog open={!!activePassportDevice} onOpenChange={(o) => !o && setActivePassportDevice(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold">
                    <Cpu className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-black text-foreground">
                      {activePassportDevice.deviceName}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-bold text-primary">IP: {activePassportDevice.ipAddress || "Cloud Push"}:{activePassportDevice.port}</span>
                      <span>·</span>
                      <span>SN: {activePassportDevice.serialNumber}</span>
                      <span>·</span>
                      <span>Timezone: Asia/Kolkata (IST)</span>
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      applySyncMut.mutate({
                        deviceId: activePassportDevice.id,
                        importUnmappedUsers: true,
                        syncPunches: true,
                      })
                    }
                    disabled={applySyncMut.isPending}
                    className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    <Sparkles className="size-3.5" />
                    <span>{applySyncMut.isPending ? "Applying & Syncing..." : "Apply & Sync All to DB"}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportPassportCsv}
                    className="h-8 text-xs font-bold gap-1"
                  >
                    <Download className="size-3.5 text-blue-600" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </div>

              {/* Tabs Switcher */}
              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPassportTab("logs")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    passportTab === "logs"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="size-3.5" />
                  <span>Attendance Punch Stream</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPassportTab("hardware_users")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    passportTab === "hardware_users"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="size-3.5" />
                  <span>Enrolled Staff & Biometric ID Mapping</span>
                  {hardwareUsersData?.totalHardwareUsers > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">
                      {hardwareUsersData.totalHardwareUsers}
                    </Badge>
                  )}
                </button>
              </div>
            </DialogHeader>

            <div className="py-2 text-xs space-y-4">
              {/* TAB 1: ATTENDANCE PUNCH STREAM */}
              {passportTab === "logs" && (
                <div className="space-y-4">
                  {/* Capacities */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="p-3 border shadow-2xs bg-card space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Fingerprint className="size-3.5 text-primary" /> Fingerprint Profiles
                      </span>
                      <div className="text-lg font-black font-mono text-foreground">
                        {passportData?.stats?.totalFingerprints || 0} Registered
                      </div>
                    </Card>

                    <Card className="p-3 border shadow-2xs bg-card space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <ScanFace className="size-3.5 text-purple-600" /> Face 3D Profiles
                      </span>
                      <div className="text-lg font-black font-mono text-purple-600">
                        {passportData?.stats?.totalFaces || 0} Registered
                      </div>
                    </Card>

                    <Card className="p-3 border shadow-2xs bg-card space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Radio className="size-3.5 text-blue-600" /> RFID Cards
                      </span>
                      <div className="text-lg font-black font-mono text-blue-600">
                        {passportData?.stats?.totalCards || 0} Registered
                      </div>
                    </Card>

                    <Card className="p-3 border shadow-2xs bg-card space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <HardDrive className="size-3.5 text-emerald-600" /> Total Machine Logs
                      </span>
                      <div className="text-lg font-black font-mono text-foreground">
                        {passportData?.stats?.allTimePunches || 0} Records
                      </div>
                    </Card>
                  </div>

                  {/* Time Range Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-xl border">
                    <div className="flex items-center gap-1 bg-background p-1 rounded-lg border">
                      {(["daily", "weekly", "monthly", "all"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPassportPeriod(p)}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all capitalize ${
                            passportPeriod === p
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {p === "daily" ? "Daily (Today)" : p === "weekly" ? "Weekly (7 Days)" : p === "monthly" ? "Monthly" : "All Time"}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-muted-foreground">
                        Punches in Period: <strong className="text-primary font-black">{passportData?.stats?.totalPunchesInPeriod || 0}</strong>
                      </span>
                      <span>·</span>
                      <span className="text-muted-foreground">
                        Unique Staff: <strong className="text-foreground font-black">{passportData?.stats?.uniqueStaffInPeriod || 0}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Punches Table */}
                  <Card className="border shadow-2xs overflow-hidden">
                    <CardContent className="p-0 overflow-x-auto max-h-72">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 text-xs">
                            <TableHead className="text-xs">Time (IST)</TableHead>
                            <TableHead className="text-xs">Staff</TableHead>
                            <TableHead className="text-xs">Verification</TableHead>
                            <TableHead className="text-xs">Punch Type</TableHead>
                            <TableHead className="text-xs text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {isPassportLoading ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs">
                                Fetching machine logs...
                              </TableCell>
                            </TableRow>
                          ) : !passportData?.punchLogs || passportData.punchLogs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs italic">
                                No punch logs recorded for this machine in the {passportPeriod} period.
                              </TableCell>
                            </TableRow>
                          ) : (
                            passportData.punchLogs.map((log: any) => (
                              <TableRow key={log.id} className="text-xs hover:bg-muted/20">
                                <TableCell className="font-mono text-xs font-bold text-foreground">
                                  {new Date(log.punchTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                  <span className="text-[10px] text-muted-foreground block font-normal">
                                    {new Date(log.punchTime).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                                  </span>
                                </TableCell>

                                <TableCell>
                                  {log.employee ? (
                                    <div>
                                      <span className="font-bold text-foreground block">
                                        {log.employee.firstName} {log.employee.lastName}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        ID: {log.employeeCode} · {log.employee.department?.name || "General"}
                                      </span>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="font-bold text-rose-600 block">Unmatched Staff</span>
                                      <span className="text-[10px] text-muted-foreground font-mono">Code: {log.employeeCode}</span>
                                    </div>
                                  )}
                                </TableCell>

                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] font-medium capitalize gap-1 bg-muted/40">
                                    {log.verificationMode === "face" ? (
                                      <ScanFace className="size-3 text-purple-600" />
                                    ) : log.verificationMode === "rfid" ? (
                                      <Radio className="size-3 text-blue-600" />
                                    ) : (
                                      <Fingerprint className="size-3 text-primary" />
                                    )}
                                    <span>{log.verificationMode}</span>
                                  </Badge>
                                </TableCell>

                                <TableCell>
                                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] font-mono capitalize">
                                    {log.punchType}
                                  </Badge>
                                </TableCell>

                                <TableCell className="text-right">
                                  {log.syncStatus === "processed" ? (
                                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1 shadow-2xs">
                                      <CheckCircle2 className="size-3" /> Synced
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                                      Unmatched
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAB 2: ENROLLED STAFF & BIOMETRIC ID MAPPING */}
              {passportTab === "hardware_users" && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-2.5 rounded-xl border">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                        <Input
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Search machine staff..."
                          className="h-7 text-xs pl-8 w-48 sm:w-60 bg-background"
                        />
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
                        {hardwareUsersData?.matchedCount || 0} / {hardwareUsersData?.totalHardwareUsers || 0} Mapped
                      </Badge>
                    </div>

                    <Button
                      size="sm"
                      onClick={() =>
                        applySyncMut.mutate({
                          deviceId: activePassportDevice.id,
                          importUnmappedUsers: true,
                          syncPunches: true,
                        })
                      }
                      disabled={applySyncMut.isPending}
                      className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground"
                    >
                      <UserPlus className="size-3" />
                      <span>Auto-Import All Unmapped to HRMS</span>
                    </Button>
                  </div>

                  <Card className="border shadow-2xs overflow-hidden">
                    <CardContent className="p-0 overflow-x-auto max-h-80">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 text-xs">
                            <TableHead className="text-xs">Machine User ID (PIN)</TableHead>
                            <TableHead className="text-xs">Machine Name</TableHead>
                            <TableHead className="text-xs">RFID Card</TableHead>
                            <TableHead className="text-xs">HRMS Matching Status</TableHead>
                            <TableHead className="text-xs text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {isHardwareUsersLoading ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-xs">
                                Scanning machine memory for enrolled users...
                              </TableCell>
                            </TableRow>
                          ) : filteredHardwareUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-xs italic">
                                No enrolled users found on device.
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredHardwareUsers.map((u: any) => (
                              <TableRow key={u.uid} className="text-xs hover:bg-muted/20">
                                <TableCell className="font-mono font-bold text-xs text-primary">
                                  #{u.biometricId}
                                  <span className="text-[10px] text-muted-foreground block font-normal">UID: {u.uid}</span>
                                </TableCell>

                                <TableCell className="font-bold text-foreground">
                                  {u.name}
                                </TableCell>

                                <TableCell className="font-mono text-muted-foreground text-xs">
                                  {u.cardno && u.cardno !== 0 ? u.cardno : "None"}
                                </TableCell>

                                <TableCell>
                                  {u.isMatched ? (
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                      <CheckCircle2 className="size-3.5 shrink-0" />
                                      <span>Matched: {u.matchedEmployee?.name} (ID: {u.matchedEmployee?.employeeCode})</span>
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/30">
                                      Unmapped Machine User
                                    </Badge>
                                  )}
                                </TableCell>

                                <TableCell className="text-right">
                                  {!u.isMatched && (
                                    <Select
                                      onValueChange={(empId) =>
                                        mapEmployeeMut.mutate({
                                          deviceId: activePassportDevice.id,
                                          employeeId: empId,
                                          biometricId: u.biometricId,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-6 text-[10px] w-36 bg-background">
                                        <SelectValue placeholder="Map to Staff..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {employees.map((emp: any) => (
                                          <SelectItem key={emp.id} value={emp.id} className="text-xs">
                                            {emp.first_name} {emp.last_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-mono">
                Device: {activePassportDevice.deviceName} ({activePassportDevice.ipAddress}:{activePassportDevice.port})
              </span>
              <Button size="sm" variant="outline" onClick={() => setActivePassportDevice(null)}>
                Close Passport
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 1: CLOUD SERVER MACHINE SETUP GUIDE ─── */}
      <Dialog open={isCloudConfigOpen} onOpenChange={setIsCloudConfigOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Globe className="size-5 text-primary" />
              <span>Biometric Machine Cloud Setup Parameters</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter these settings inside your physical biometric machine's <strong>COMM / Cloud Server / ADMS</strong> setup menu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">1. Server Host / Domain / IP</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={cloudConfig?.serverHost || "localhost"} className="h-8 text-xs font-mono bg-background" />
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(cloudConfig?.serverHost || "localhost", "Server Host")} className="h-8">
                    Copy
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">2. Server Port</Label>
                  <Input readOnly value={cloudConfig?.serverPort || "4000"} className="h-8 text-xs font-mono bg-background" />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">3. Enable Cloud / ADMS Push</Label>
                  <Input readOnly value="ON (Enabled)" className="h-8 text-xs font-semibold text-emerald-600 bg-background" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">4. Web Server URL / ADMS Endpoint</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={cloudConfig?.admsPushUrl || "http://localhost:4000/iclock/cdata"} className="h-8 text-xs font-mono bg-background" />
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(cloudConfig?.admsPushUrl || "http://localhost:4000/iclock/cdata", "ADMS URL")} className="h-8">
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-2">
              <span className="font-bold text-foreground block">Supported Hardware Models:</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Universal compatibility: <strong>ZKTeco, eSSL, Realtime, Hikvision, Matrix, Mantra, Biomax, Anviz, Suprema, Startek</strong> and any device supporting standard ADMS / iClock / HTTP webhooks.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setIsCloudConfigOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: 24/7 LOCAL LAN SDK AGENT ─── */}
      <Dialog open={isAgentModalOpen} onOpenChange={setIsAgentModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Network className="size-5 text-emerald-600" />
              <span>24/7 Local LAN Biometric Edge Sync Agent</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              For on-premise local machines (e.g. ZKTeco / eSSL on LAN Port 4370) without direct cloud internet access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">How LAN 24/7 Sync Works</Badge>
                <span className="font-bold text-foreground">Local TCP/IP ➔ Cloud Bridge Daemon</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                If your biometric machine is connected to your local office Wi-Fi / Router (e.g. <code>10.10.10.222:4370</code>) and cannot reach the public internet directly, run our lightweight <strong>Local Sync Agent</strong> on any office computer. It listens to the machine on LAN 24/7 and automatically pushes every punch to your Cloud HRMS in real-time.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Step 1: Download / Run the Edge Agent Script</Label>
              <div className="p-3 rounded-lg border bg-muted/40 font-mono text-[11px] space-y-1">
                <p className="text-muted-foreground"># Navigate to your project directory and run:</p>
                <p className="text-primary font-bold">node scripts/biometric-agent.js</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Step 2: Environment Variables for Office PC</Label>
              <div className="grid grid-cols-1 gap-2">
                <div className="p-2.5 rounded-lg border bg-background flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">CLOUD_SERVER_URL</span>
                    <span className="font-mono font-bold text-primary text-xs">
                      {cloudConfig?.genericWebhookUrl || "http://localhost:4000/api/public/biometric/push"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(cloudConfig?.genericWebhookUrl || "http://localhost:4000/api/public/biometric/push", "Cloud Webhook URL")}
                    className="h-7 text-xs"
                  >
                    Copy
                  </Button>
                </div>

                <div className="p-2.5 rounded-lg border bg-background flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">TENANT_API_KEY</span>
                    <span className="font-mono font-bold text-foreground text-xs">
                      {tenantId || "default-workspace"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(tenantId || "default-workspace", "Tenant API Key")}
                    className="h-7 text-xs"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setIsAgentModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: AUTO-PROBE NETWORK DEVICE SCANNER ─── */}
      <Dialog open={isProbeOpen} onOpenChange={setIsProbeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Radar className="size-5 text-blue-600" />
              <span>Auto-Probe & Discover Network Terminal</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter your biometric machine's IP address on the local network. The system will connect via TCP/UDP, verify handshake, and automatically register it.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              probeDeviceMut.mutate(probeForm);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Device IP Address *</Label>
                <Input
                  required
                  placeholder="10.10.10.222"
                  value={probeForm.ipAddress}
                  onChange={(e) => setProbeForm({ ...probeForm, ipAddress: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Port</Label>
                <Input
                  required
                  placeholder="4370"
                  value={probeForm.port}
                  onChange={(e) => setProbeForm({ ...probeForm, port: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Friendly Device Name</Label>
              <Input
                placeholder="e.g. TSV GLOBAL SOLUTIONS PVT LTD"
                value={probeForm.deviceName}
                onChange={(e) => setProbeForm({ ...probeForm, deviceName: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Location</Label>
              <Input
                placeholder="e.g. Ground Floor Main Entrance"
                value={probeForm.location}
                onChange={(e) => setProbeForm({ ...probeForm, location: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsProbeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={probeDeviceMut.isPending} className="text-xs font-bold gap-1 bg-primary text-primary-foreground">
                <Radar className="size-3" /> Auto-Probe & Connect
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: UNIVERSAL DEVICE MANUAL REGISTRATION ─── */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Cpu className="size-5 text-primary" />
              <span>Add Biometric Attendance Terminal</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Universal registration for any biometric brand, model, or cloud terminal.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              registerDeviceMut.mutate(registerForm);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Device Name / Organization Reference *</Label>
              <Input
                required
                placeholder="e.g. TSV GLOBAL SOLUTIONS PVT LTD - Main Entrance"
                value={registerForm.deviceName}
                onChange={(e) => setRegisterForm({ ...registerForm, deviceName: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Device Brand & Model</Label>
                <Input
                  placeholder="e.g. eSSL SilkBio-101TC, ZKTeco, Realtime..."
                  value={registerForm.deviceModel}
                  onChange={(e) => setRegisterForm({ ...registerForm, deviceModel: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Hardware Type</Label>
                <Select
                  value={registerForm.deviceType}
                  onValueChange={(v) => setRegisterForm({ ...registerForm, deviceType: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hybrid">Fingerprint + Face (Hybrid)</SelectItem>
                    <SelectItem value="fingerprint">Fingerprint Reader</SelectItem>
                    <SelectItem value="face_recognition">Face Recognition</SelectItem>
                    <SelectItem value="rfid_card">RFID Card Terminal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Terminal Role / Attendance Purpose *</Label>
              <Select
                value={registerForm.purpose}
                onValueChange={(v) => setRegisterForm({ ...registerForm, purpose: v })}
              >
                <SelectTrigger className="h-8 text-xs font-medium"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both (Check-In & Check-Out Terminal - Standard)</SelectItem>
                  <SelectItem value="check_in_only">Entrance Gate (Check-In Only / 1st Punch of Day)</SelectItem>
                  <SelectItem value="check_out_only">Exit Gate (Check-Out Only / Last Punch of Day)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Set role for dual-device setups (e.g. Entrance Terminal for 1st Punch In, Exit Terminal for Last Punch Out).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">IP Address (Optional for Cloud Push)</Label>
                <Input
                  placeholder="10.10.10.222"
                  value={registerForm.ipAddress}
                  onChange={(e) => setRegisterForm({ ...registerForm, ipAddress: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Port</Label>
                <Input
                  placeholder="4370"
                  value={registerForm.port}
                  onChange={(e) => setRegisterForm({ ...registerForm, port: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Hardware Serial Number (Optional)</Label>
                <Input
                  placeholder="Auto-detected or enter SN"
                  value={registerForm.serialNumber}
                  onChange={(e) => setRegisterForm({ ...registerForm, serialNumber: e.target.value })}
                  className="h-8 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Physical Location</Label>
                <Input
                  placeholder="e.g. Main Entrance Gate 1"
                  value={registerForm.location}
                  onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold block cursor-pointer">Auto Attendance Calculation</Label>
                <span className="text-[10px] text-muted-foreground">
                  Automatically marks check-in / check-out and computes work hours for matching staff codes.
                </span>
              </div>
              <Switch
                checked={registerForm.autoAttendanceSync}
                onCheckedChange={(c) => setRegisterForm({ ...registerForm, autoAttendanceSync: c })}
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsRegisterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={registerDeviceMut.isPending} className="text-xs font-bold">
                Connect Terminal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 5: SIMULATE BIOMETRIC PUNCH (TESTING SANDBOX) ─── */}
      <Dialog open={isSimulateOpen} onOpenChange={setIsSimulateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              <span>Simulate Biometric Hardware Punch</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Test instant attendance check-in, check-out, and socket broadcasts without physical hardware.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              simulatePunchMut.mutate(simulateForm);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Employee *</Label>
              <Select
                value={simulateForm.employeeCode}
                onValueChange={(code) => setSimulateForm({ ...simulateForm, employeeCode: code })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose Employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.employee_code}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Biometric Terminal *</Label>
              <Select
                value={simulateForm.deviceId}
                onValueChange={(id) => setSimulateForm({ ...simulateForm, deviceId: id })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose Terminal" /></SelectTrigger>
                <SelectContent>
                  {devices.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.deviceName} ({d.purpose === 'check_in_only' ? 'Entrance / In Only' : d.purpose === 'check_out_only' ? 'Exit / Out Only' : 'Both In & Out'} - {d.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Verification Mode</Label>
                <Select
                  value={simulateForm.verificationMode}
                  onValueChange={(v) => setSimulateForm({ ...simulateForm, verificationMode: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fingerprint">Fingerprint Scan</SelectItem>
                    <SelectItem value="face">3D Face Scan</SelectItem>
                    <SelectItem value="rfid">RFID Badge Tap</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Punch Direction</Label>
                <Select
                  value={simulateForm.punchType}
                  onValueChange={(v) => setSimulateForm({ ...simulateForm, punchType: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Check-In / Out)</SelectItem>
                    <SelectItem value="check_in">Explicit Check In</SelectItem>
                    <SelectItem value="check_out">Explicit Check Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsSimulateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={simulatePunchMut.isPending} className="text-xs font-bold gap-1 bg-primary text-primary-foreground">
                <Fingerprint className="size-3" /> Simulate Fingerprint
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
