"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import { useNavigationResolver } from "@/lib/navigation-resolver";
import { AddonNotInstalled } from "@/components/addon-not-installed";
import {
  Fingerprint,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  Server,
  Search,
  UserCheck,
  Upload,
  UserPlus,
  UserX,
  Copy,
  Download,
  Pencil,
  Radio,
  CheckCircle2,
  Cloud,
  Link2,
  ExternalLink,
} from "lucide-react";

type BiometricDevice = {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  syncProtocol: string;
  purpose: string;
  ip: string;
  location: string;
  port: number;
  autoSync: boolean;
  status: "online" | "offline" | "syncing";
  lastSync: string;
  recordsSynced: number;
};

type EmployeePunchLog = {
  id: string;
  deviceId: string;
  deviceName: string;
  employeeId?: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  verificationMode: string;
  punchType: "Clock In" | "Clock Out";
  timestamp: string;
  date: string;
  time: string;
  attendanceUpdated: boolean;
  isRegistered: boolean;
};

const DEVICE_MODELS = [
  "ZKTeco uFace 800",
  "ZKTeco K40 / K60",
  "eSSL E9C / K30 Pro",
  "eSSL X990 / Identix",
  "Realtime T304 / RS20",
  "Hikvision DS-K1T502",
  "Suprema BioStation A2",
  "Matrix COSEC APTA",
];

const SYNC_PROTOCOLS = [
  { value: "iclock_adms", label: "iClock ADMS Cloud Push (Recommended)" },
  { value: "direct_tcp", label: "Direct LAN TCP/IP (Port 4370)" },
  { value: "push_api_webhook", label: "HTTP JSON Push Webhook" },
];

const DEVICE_PURPOSES = [
  { value: "both", label: "Auto (First-In / Last-Out)" },
  { value: "check_in_only", label: "Check-In Only" },
  { value: "check_out_only", label: "Check-Out Only" },
];

const EMPTY_FORM = {
  name: "",
  serialNumber: "",
  model: DEVICE_MODELS[0],
  syncProtocol: "iclock_adms",
  purpose: "both",
  ip: "10.10.10.215",
  port: 4370,
  location: "Main Entrance",
  autoSync: true,
};

export function BiometricSyncConsole() {
  const router = useRouter();
  const { isEntitled, isLoading: isNavLoading } = useNavigationResolver();
  const hasEntitlement = isEntitled("biometric-sync");
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || "default";

  const [activeTab, setActiveTab] = useState<string>("devices");
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [deviceForm, setDeviceForm] = useState(EMPTY_FORM);
  const [isSavingDevice, setIsSavingDevice] = useState(false);

  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
  const [syncStage, setSyncStage] = useState<number>(0);
  const [syncElapsedSec, setSyncElapsedSec] = useState<number>(0);
  const [testingPingId, setTestingPingId] = useState<string | null>(null);

  const [searchPunch, setSearchPunch] = useState("");
  const [filterRegistration, setFilterRegistration] = useState<"all" | "registered" | "unregistered">("all");
  const [filterPunchType, setFilterPunchType] = useState("all");

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importFileContent, setImportFileContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [quickRegModalPunch, setQuickRegModalPunch] = useState<EmployeePunchLog | null>(null);
  const [quickRegForm, setQuickRegForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    departmentId: "",
  });
  const [isRegisteringUser, setIsRegisteringUser] = useState(false);

  const [selectedMappingDeviceId, setSelectedMappingDeviceId] = useState<string>("");
  const [mappingEmployeeId, setMappingEmployeeId] = useState<string>("");
  const [mappingDevicePin, setMappingDevicePin] = useState<string>("");
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  const { data: dbEmployees = [] } = useQuery({
    queryKey: ["employees-for-biometric-mapping", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/employees?limit=500");
        return Array.isArray(res) ? res : res?.employees || res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: cloudConfig } = useQuery({
    queryKey: ["biometric-cloud-config", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/biometric/cloud-config");
        return res?.data || res || {};
      } catch {
        return {};
      }
    },
  });

  const { data: dbDepartments = [] } = useQuery({
    queryKey: ["departments-for-biometric", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/employees/departments");
        return Array.isArray(res) ? res : res?.departments || res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: dbDesignations = [] } = useQuery({
    queryKey: ["designations-for-biometric", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/organization/designations");
        return Array.isArray(res) ? res : res?.designations || res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: dbDevices = [] } = useQuery({
    queryKey: ["biometric-devices", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/biometric/devices");
        return Array.isArray(res) ? res : res?.devices || res?.data || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });

  const { data: dbLogsResponse = [] } = useQuery({
    queryKey: ["biometric-logs", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/biometric/logs?limit=100");
        return res?.logs || res?.data?.logs || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 5000,
  });

  const devices: BiometricDevice[] = useMemo(() => {
    return dbDevices.map((d: any) => ({
      id: d.id,
      name: d.deviceName || "Biometric Terminal",
      model: d.deviceModel || "Universal Biometric Device",
      serialNumber: d.serialNumber || "",
      syncProtocol: d.syncProtocol || "iclock_adms",
      purpose: d.purpose || "both",
      ip: d.ipAddress || "",
      location: d.location || "Main Entrance",
      port: d.port || 4370,
      autoSync: d.autoAttendanceSync !== false,
      status: (d.status === "online" || d.status === "syncing" ? d.status : "offline") as "online" | "offline" | "syncing",
      lastSync: d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString("en-IN") : "Never synced",
      recordsSynced: d._count?.punchLogs ?? d.totalPunchLogs ?? 0,
    }));
  }, [dbDevices]);

  const activeMappingDeviceId = selectedMappingDeviceId || devices[0]?.id || "";
  const [inlineLinkSelection, setInlineLinkSelection] = useState<Record<string, string>>({});

  const {
    data: hardwareUsersData,
    isFetching: isFetchingHardwareUsers,
    refetch: refetchHardwareUsers,
  } = useQuery({
    queryKey: ["biometric-hardware-users", activeMappingDeviceId],
    enabled: !!activeMappingDeviceId,
    queryFn: async () => {
      try {
        const res = await api.get(`/biometric/devices/${activeMappingDeviceId}/hardware-users`);
        return res?.data || res || { users: [] };
      } catch {
        return { users: [] };
      }
    },
  });

  const hardwareUsers: any[] = hardwareUsersData?.users || [];

  const hardwareNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of hardwareUsers) {
      if (u?.biometricId && u?.name && !/^user\s+\d+$/i.test(String(u.name).trim())) {
        m.set(String(u.biometricId).trim(), String(u.name).trim());
      }
    }
    return m;
  }, [hardwareUsers]);

  const allPunches: EmployeePunchLog[] = useMemo(() => {
    return (dbLogsResponse || []).map((l: any) => {
      const punchDate = new Date(l.punchTime);
      const isRegistered = !!l.employeeId;
      const hwName = hardwareNameMap.get(String(l.employeeCode || "").trim());
      const empName = l.employee
        ? `${l.employee.firstName} ${l.employee.lastName}`
        : hwName
          ? `${hwName} (Machine ID: ${l.employeeCode})`
          : `Unregistered User (${l.employeeCode})`;
      return {
        id: l.id,
        deviceId: l.deviceId,
        deviceName: l.device?.deviceName || "Terminal",
        employeeId: l.employeeId || undefined,
        employeeCode: l.employeeCode,
        employeeName: empName,
        department: l.employee?.department?.name || "Unassigned",
        verificationMode:
          l.verificationMode === "face"
            ? "Face Recognition"
            : l.verificationMode === "rfid"
              ? "RFID Card"
              : "Fingerprint",
        punchType: l.punchType === "check_out" ? "Clock Out" : "Clock In",
        timestamp: punchDate.toLocaleString("en-IN"),
        date: punchDate.toISOString().slice(0, 10),
        time: punchDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
        attendanceUpdated: l.syncStatus === "processed",
        isRegistered,
      };
    });
  }, [dbLogsResponse]);

  const filteredPunches = useMemo(() => {
    return allPunches.filter((p) => {
      const q = searchPunch.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.employeeName.toLowerCase().includes(q) ||
        p.employeeCode.toLowerCase().includes(q) ||
        p.deviceName.toLowerCase().includes(q);
      const matchType =
        filterPunchType === "all" ||
        (filterPunchType === "in" && p.punchType === "Clock In") ||
        (filterPunchType === "out" && p.punchType === "Clock Out");
      const matchReg =
        filterRegistration === "all" ||
        (filterRegistration === "registered" && p.isRegistered) ||
        (filterRegistration === "unregistered" && !p.isRegistered);
      return matchSearch && matchType && matchReg;
    });
  }, [allPunches, searchPunch, filterPunchType, filterRegistration]);

  function openAddModal() {
    setEditingDeviceId(null);
    setDeviceForm(EMPTY_FORM);
    setIsDeviceModalOpen(true);
  }

  function openEditModal(device: BiometricDevice) {
    setEditingDeviceId(device.id);
    setDeviceForm({
      name: device.name,
      serialNumber: device.serialNumber || "",
      model: device.model || DEVICE_MODELS[0],
      syncProtocol: device.syncProtocol || "iclock_adms",
      purpose: device.purpose || "both",
      ip: device.ip || "",
      port: device.port || 4370,
      location: device.location || "Main Entrance",
      autoSync: device.autoSync,
    });
    setIsDeviceModalOpen(true);
  }

  async function saveDevice() {
    if (!deviceForm.name.trim()) {
      return toast.error("Terminal name is required.");
    }
    if (deviceForm.syncProtocol === "iclock_adms" && !deviceForm.serialNumber.trim()) {
      return toast.error("Hardware Serial Number (SN) is required for iClock ADMS Cloud Push.");
    }
    if (isSavingDevice) return;

    setIsSavingDevice(true);
    try {
      const payload = {
        deviceName: deviceForm.name.trim(),
        deviceModel: deviceForm.model,
        serialNumber: deviceForm.serialNumber.trim() || undefined,
        syncProtocol: deviceForm.syncProtocol,
        purpose: deviceForm.purpose,
        ipAddress: deviceForm.ip.trim() || undefined,
        port: Number(deviceForm.port) || 4370,
        location: deviceForm.location.trim() || "Main Entrance",
        autoAttendanceSync: deviceForm.autoSync,
      };

      if (editingDeviceId) {
        await api.put(`/biometric/devices/${editingDeviceId}`, payload);
        toast.success(`Updated biometric terminal "${payload.deviceName}".`);
      } else {
        await api.post("/biometric/devices", payload);
        toast.success(`Registered biometric terminal "${payload.deviceName}" (SN: ${payload.serialNumber || "N/A"}).`);
      }

      setIsDeviceModalOpen(false);
      setEditingDeviceId(null);
      setDeviceForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ["biometric-devices", tenantId] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save biometric device.");
    } finally {
      setIsSavingDevice(false);
    }
  }

  async function deleteDevice(id: string) {
    if (!confirm("Remove this biometric terminal from your tenant workspace?")) return;
    try {
      await api.delete(`/biometric/devices/${id}`);
      toast.success("Biometric terminal removed.");
      qc.invalidateQueries({ queryKey: ["biometric-devices", tenantId] });
      qc.invalidateQueries({ queryKey: ["biometric-logs", tenantId] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove device.");
    }
  }

  async function testDevicePing(device: BiometricDevice) {
    setTestingPingId(device.id);
    try {
      const res = await api.post(`/biometric/devices/${device.id}/ping`);
      if (res?.status === "online" || res?.success) {
        toast.success(res?.message || `Device "${device.name}" is online.`);
      } else {
        toast.warning(res?.message || `Device "${device.name}" is currently offline.`);
      }
      qc.invalidateQueries({ queryKey: ["biometric-devices", tenantId] });
    } catch (err: any) {
      toast.error(err?.message || `Unable to reach ${device.ip}:${device.port}.`);
    } finally {
      setTestingPingId(null);
    }
  }

  async function triggerSync(device: BiometricDevice) {
    if (syncingDeviceId) return;
    setSyncingDeviceId(device.id);
    setSyncStage(1);
    setSyncElapsedSec(0);

    const started = Date.now();
    const timer = window.setInterval(() => {
      const sec = (Date.now() - started) / 1000;
      setSyncElapsedSec(sec);
      if (sec > 1.8) setSyncStage(3);
      else if (sec > 0.7) setSyncStage(2);
    }, 150);

    try {
      const res = await api.post(`/biometric/devices/${device.id}/sync-now`);
      setSyncStage(3);
      toast.success(res?.message || `Sync completed for ${device.name}.`);
      qc.invalidateQueries({ queryKey: ["biometric-devices", tenantId] });
      qc.invalidateQueries({ queryKey: ["biometric-logs", tenantId] });
      qc.invalidateQueries({ queryKey: ["biometric-hardware-users", activeMappingDeviceId] });
      qc.invalidateQueries({ queryKey: ["attendance-list"] });
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
    } catch (err: any) {
      toast.error(err?.message || "Sync failed.");
    } finally {
      window.clearInterval(timer);
      setSyncingDeviceId(null);
      setSyncStage(0);
      setSyncElapsedSec(0);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setImportFileContent(String(evt.target?.result || ""));
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function processImportedFile() {
    if (!importFileContent.trim()) return toast.error("File is empty.");
    const lines = importFileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    let importedCount = 0;

    for (const line of lines) {
      const parts = line.split(/[\t,;\s]+/).map((s) => s.trim());
      if (parts.length < 2) continue;
      const empCode = parts[0];
      const punchType = parts[3] === "1" ? "check_out" : "check_in";
      try {
        await api.post("/biometric/simulate", {
          deviceId: devices[0]?.id || undefined,
          employeeCode: empCode,
          punchType,
        });
        importedCount++;
      } catch {}
    }

    qc.invalidateQueries({ queryKey: ["biometric-logs", tenantId] });
    qc.invalidateQueries({ queryKey: ["biometric-devices", tenantId] });
    setIsImportModalOpen(false);
    setImportFileContent("");
    setActiveTab("punches");
    toast.success(`Imported ${importedCount} punch records from "${importFileName}".`);
  }

  function openQuickRegister(punch: EmployeePunchLog) {
    setQuickRegForm({
      firstName: "",
      lastName: "",
      email: `${punch.employeeCode.toLowerCase()}@workspace.com`,
      position: "Staff Member",
      departmentId: dbDepartments[0]?.id || "",
    });
    setQuickRegModalPunch(punch);
  }

  async function handleQuickRegister(openProfileAfter = false) {
    if (!quickRegModalPunch) return;
    if (!quickRegForm.firstName.trim() || !quickRegForm.lastName.trim()) {
      return toast.error("First name and last name are required.");
    }
    setIsRegisteringUser(true);
    try {
      const selectedDesig = dbDesignations.find(
        (d: any) => d.id === quickRegForm.position || d.name === quickRegForm.position
      );
      const newEmpRes = await api.post("/employees", {
        employeeCode: quickRegModalPunch.employeeCode,
        firstName: quickRegForm.firstName.trim(),
        lastName: quickRegForm.lastName.trim(),
        email: quickRegForm.email.trim() || `${quickRegModalPunch.employeeCode.toLowerCase()}@workspace.com`,
        position: selectedDesig?.name || quickRegForm.position || "Staff Member",
        designationId: selectedDesig?.id || undefined,
        departmentId: quickRegForm.departmentId || null,
        employmentType: "full_time",
        status: "active",
      });
      const newEmp = newEmpRes?.employee || newEmpRes?.data || newEmpRes;

      if (quickRegModalPunch.deviceId && newEmp?.id) {
        try {
          await api.post(`/biometric/devices/${quickRegModalPunch.deviceId}/mappings`, {
            employeeId: newEmp.id,
            devicePin: quickRegModalPunch.employeeCode,
            vendorType: "zkteco_adms",
          });
        } catch {}
      }

      qc.invalidateQueries({ queryKey: ["biometric-logs", tenantId] });
      qc.invalidateQueries({ queryKey: ["biometric-hardware-users", activeMappingDeviceId] });
      qc.invalidateQueries({ queryKey: ["biometric-mappings", activeMappingDeviceId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employees-for-biometric-mapping", tenantId] });
      setQuickRegModalPunch(null);
      toast.success(`Registered ${quickRegForm.firstName} ${quickRegForm.lastName} (${quickRegModalPunch.employeeCode}).`);

      if (openProfileAfter && newEmp?.id) {
        router.push(`/hr/employees/${newEmp.id}/edit`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to register employee.");
    } finally {
      setIsRegisteringUser(false);
    }
  }

  function copyValue(label: string, val: string) {
    if (!val) return;
    navigator.clipboard.writeText(val);
    toast.success(`Copied ${label}: ${val}`);
  }

  const { data: deviceMappings = [] } = useQuery({
    queryKey: ["biometric-mappings", activeMappingDeviceId],
    enabled: !!activeMappingDeviceId,
    queryFn: async () => {
      try {
        const res = await api.get(`/biometric/devices/${activeMappingDeviceId}/mappings`);
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  async function linkHardwareUserToEmployee(biometricId: string, employeeId: string) {
    if (!activeMappingDeviceId || !employeeId) {
      return toast.error("Please select an employee to link.");
    }
    try {
      await api.post(`/biometric/devices/${activeMappingDeviceId}/mappings`, {
        employeeId,
        devicePin: biometricId,
        vendorType: "zkteco_adms",
      });
      toast.success(`Linked Hardware User ID "${biometricId}" to employee!`);
      qc.invalidateQueries({ queryKey: ["biometric-mappings", activeMappingDeviceId] });
      qc.invalidateQueries({ queryKey: ["biometric-hardware-users", activeMappingDeviceId] });
      qc.invalidateQueries({ queryKey: ["biometric-logs", tenantId] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to link employee.");
    }
  }

  function openQuickRegisterFromHardwareUser(hwUser: any) {
    const rawName = String(hwUser.name || "").trim();
    const isPlaceholder = !rawName || /^user\s+\d+$/i.test(rawName);
    const parts = isPlaceholder ? [] : rawName.split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    setQuickRegForm({
      firstName,
      lastName,
      email: `emp.${String(hwUser.biometricId).toLowerCase()}@workspace.com`,
      position: dbDesignations[0]?.name || "",
      departmentId: dbDepartments[0]?.id || "",
    });
    setQuickRegModalPunch({
      id: `hw-${hwUser.biometricId}`,
      deviceId: activeMappingDeviceId,
      deviceName: devices.find((d) => d.id === activeMappingDeviceId)?.name || "Biometric Terminal",
      employeeCode: String(hwUser.biometricId),
      employeeName: hwUser.name || `User ${hwUser.biometricId}`,
      department: "Unassigned",
      verificationMode: (hwUser.authModes || []).join(", ") || "Fingerprint",
      punchType: "Clock In",
      timestamp: new Date().toLocaleString("en-IN"),
      date: new Date().toISOString().slice(0, 10),
      time: "",
      attendanceUpdated: false,
      isRegistered: false,
    });
  }

  async function saveEmployeeMapping() {
    if (!activeMappingDeviceId) return toast.error("Register or select a biometric device first.");
    if (!mappingEmployeeId) return toast.error("Please select an employee.");
    if (!mappingDevicePin.trim()) return toast.error("Please enter the biometric machine User ID / PIN.");
    setIsSavingMapping(true);
    try {
      await api.post(`/biometric/devices/${activeMappingDeviceId}/mappings`, {
        employeeId: mappingEmployeeId,
        devicePin: mappingDevicePin.trim(),
        vendorType: "zkteco_adms",
      });
      toast.success(`Mapped Hardware PIN "${mappingDevicePin.trim()}" to employee!`);
      setMappingDevicePin("");
      setMappingEmployeeId("");
      qc.invalidateQueries({ queryKey: ["biometric-mappings", activeMappingDeviceId] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save employee mapping.");
    } finally {
      setIsSavingMapping(false);
    }
  }

  async function deleteEmployeeMapping(mappingId: string) {
    if (!activeMappingDeviceId) return;
    try {
      await api.delete(`/biometric/devices/${activeMappingDeviceId}/mappings/${mappingId}`);
      toast.success("Mapping removed.");
      qc.invalidateQueries({ queryKey: ["biometric-mappings", activeMappingDeviceId] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete mapping.");
    }
  }

  const [isReprocessingAttendance, setIsReprocessingAttendance] = useState(false);

  async function reprocessAllAttendance() {
    if (isReprocessingAttendance) return;
    setIsReprocessingAttendance(true);
    try {
      const res = await api.post("/biometric/reprocess-attendance", {});
      toast.success(res?.message || "All machine punches synced to Attendance!");
      qc.invalidateQueries({ queryKey: ["biometric-logs", tenantId] });
      qc.invalidateQueries({ queryKey: ["attendance-list"] });
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to sync punches to attendance.");
    } finally {
      setIsReprocessingAttendance(false);
    }
  }

  const admsHost = cloudConfig?.serverHost || "api.masterhrms.com";
  const admsPort = "80";

  if (!isNavLoading && !hasEntitlement) {
    return (
      <AddonNotInstalled
        addonName="Biometric Device Cloud Sync"
        addonSlug="biometric-sync"
        category="Integrations"
        description="Real-time ZKTeco, eSSL, and Realtime biometric terminal ADMS cloud push synchronization."
      />
    );
  }

  return (
    <PlanGuard moduleName="Biometric Hardware Sync" requiredPlan="starter">
      <div className="w-full space-y-5">
        <PageHeader
          title="Biometric Hardware & ADMS Sync"
          description="Register physical ZKTeco / eSSL terminals by Serial Number, configure Master HRMS Device Manager ADMS Push, and monitor live punches."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".dat,.csv,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={reprocessAllAttendance}
                disabled={isReprocessingAttendance}
                className="gap-1.5"
              >
                {isReprocessingAttendance ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
                Sync Logs to Attendance
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                <Upload className="size-4 text-emerald-600" /> Import USB Log
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href="/downloads/MasterHRMS-Device-Manager-CrossPlatform.zip" download>
                  <Download className="size-4 text-primary" /> Device Manager (Win / Mac / Linux)
                </a>
              </Button>
              <Button size="sm" onClick={openAddModal} className="gap-1.5">
                <Plus className="size-4" /> Register Hardware
              </Button>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Hardware Devices", value: devices.length, icon: Server, color: "text-primary", bg: "bg-primary/10" },
            {
              label: "Online Terminals",
              value: devices.filter((d) => d.status === "online").length,
              icon: Wifi,
              color: "text-emerald-600",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Registered Staff Punches",
              value: allPunches.filter((p) => p.isRegistered).length,
              icon: UserCheck,
              color: "text-sky-600",
              bg: "bg-sky-500/10",
            },
            {
              label: "Unregistered Device Users",
              value: allPunches.filter((p) => !p.isRegistered).length,
              icon: UserX,
              color: "text-amber-600",
              bg: "bg-amber-500/10",
            },
          ].map((m) => (
            <Card key={m.label} className="p-4 flex items-center gap-3 border border-border/80 rounded-xl bg-card shadow-xs">
              <div className={`size-10 rounded-xl ${m.bg} grid place-items-center shrink-0`}>
                <m.icon className={`size-5 ${m.color}`} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="font-bold text-lg tabular-nums">{m.value.toLocaleString()}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Modern Biometric Radar & 3-Stage Live Sync Animation */}
        {syncingDeviceId && (() => {
          const activeDev = devices.find((d) => d.id === syncingDeviceId);
          const stages = [
            { step: 1, label: "Hardware Handshake" },
            { step: 2, label: "Reading Punch Logs" },
            { step: 3, label: "Updating Attendance" },
          ];
          return (
            <Card className="relative overflow-hidden border border-primary/25 bg-gradient-to-r from-primary/[0.06] via-card to-sky-500/[0.06] rounded-xl p-4 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative size-11 shrink-0 grid place-items-center">
                    <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <span className="absolute inset-1 rounded-full bg-primary/15 animate-pulse" />
                    <div className="relative size-9 rounded-full bg-primary text-white grid place-items-center shadow-sm">
                      <Fingerprint className="size-4" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        Syncing {activeDev?.name || "Biometric Terminal"}
                      </span>
                      {activeDev?.serialNumber && (
                        <Badge variant="soft" className="text-[10px] tabular-nums">
                          {activeDev.serialNumber}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {syncElapsedSec.toFixed(1)}s
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Establishing live biometric session with {activeDev?.ip ? `${activeDev.ip}:${activeDev.port}` : "ADMS Cloud"}...
                    </p>
                  </div>
                </div>

                {/* 3-Stage Step Pipeline */}
                <div className="flex items-center gap-2 flex-wrap">
                  {stages.map((st, idx) => {
                    const isDone = syncStage > st.step;
                    const isActive = syncStage === st.step;
                    return (
                      <div key={st.step} className="flex items-center gap-2">
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                            isDone
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
                              : isActive
                                ? "bg-primary/10 text-primary border-primary/30 shadow-2xs"
                                : "bg-muted/40 text-muted-foreground border-border/60"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                          ) : isActive ? (
                            <span className="size-2 rounded-full bg-primary animate-pulse" />
                          ) : (
                            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                          )}
                          <span>{st.label}</span>
                        </div>
                        {idx < stages.length - 1 && (
                          <span className={`h-px w-3 ${isDone ? "bg-emerald-500/50" : "bg-border"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subtle Animated Bottom Scan Beam */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary/10 overflow-hidden">
                <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary to-sky-500 animate-pulse rounded-full" />
              </div>
            </Card>
          );
        })()}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="devices" className="text-xs gap-1.5">
              <Server className="size-3.5" /> Hardware Devices ({devices.length})
            </TabsTrigger>
            <TabsTrigger value="punches" className="text-xs gap-1.5">
              <Fingerprint className="size-3.5" /> Employee Punch Logs ({allPunches.length})
              {allPunches.filter((p) => !p.isRegistered).length > 0 && (
                <Badge variant="warning" className="ml-1 text-[10px] h-4 px-1.5 tabular-nums">
                  {allPunches.filter((p) => !p.isRegistered).length} NEW
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mapping" className="text-xs gap-1.5">
              <Link2 className="size-3.5" /> Employee Mapping ({deviceMappings.length})
            </TabsTrigger>
            <TabsTrigger value="setup" className="text-xs gap-1.5">
              <Cloud className="size-3.5" /> ADMS Cloud & Device Manager Setup
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: REGISTERED HARDWARE DEVICES */}
          <TabsContent value="devices" className="mt-4 space-y-4">
            {devices.length === 0 ? (
              <Card className="p-10 text-center border border-border/80 rounded-xl space-y-3">
                <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center mx-auto">
                  <Fingerprint className="size-6" />
                </div>
                <h3 className="text-base font-semibold">No Biometric Terminals Registered</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Register your ZKTeco / eSSL terminal using its hardware Serial Number (SN) so live ADMS punches are accepted for your workspace.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button size="sm" onClick={openAddModal} className="gap-1.5">
                    <Plus className="size-4" /> Register Hardware
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("setup")}>
                    View Setup Guide
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {devices.map((device) => (
                  <Card key={device.id} className="p-5 border border-border/80 rounded-xl bg-card shadow-xs space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                          <Fingerprint className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold">{device.name}</h3>
                            <Badge variant={device.status === "online" ? "success" : "secondary"}>
                              {device.status === "online" ? "Online" : "Offline"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {device.model} &bull; {device.location}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Edit Device / Serial Number" onClick={() => openEditModal(device)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Device"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => deleteDevice(device.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Serial Number & Connection Metadata */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs bg-muted/40 rounded-lg p-3 border border-border/60">
                      <div>
                        <span className="text-muted-foreground block">Serial Number (SN)</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`font-semibold tabular-nums ${device.serialNumber ? "text-foreground" : "text-amber-600"}`}>
                            {device.serialNumber || "Missing — Click Edit"}
                          </span>
                          {device.serialNumber && (
                            <button
                              type="button"
                              onClick={() => copyValue("Serial Number", device.serialNumber)}
                              className="text-muted-foreground hover:text-primary"
                              title="Copy Serial Number"
                            >
                              <Copy className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">LAN IP & Port</span>
                        <span className="font-semibold tabular-nums mt-0.5 block">
                          {device.ip ? `${device.ip}:${device.port}` : "ADMS Cloud Push"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Protocol</span>
                        <span className="font-medium mt-0.5 block">
                          {SYNC_PROTOCOLS.find((p) => p.value === device.syncProtocol)?.label || device.syncProtocol}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Punches Synced</span>
                        <span className="font-semibold tabular-nums mt-0.5 block">
                          {device.recordsSynced.toLocaleString()} &bull; {device.lastSync}
                        </span>
                      </div>
                    </div>

                    {!device.serialNumber && (
                      <div className="text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 flex items-center justify-between gap-2">
                        <span>Add this terminal&apos;s hardware Serial Number (SN) to accept live ADMS punches.</span>
                        <Button size="xs" variant="outline" onClick={() => openEditModal(device)}>
                          Add SN
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={testingPingId === device.id}
                        onClick={() => testDevicePing(device)}
                        className="gap-1.5 flex-1"
                      >
                        {testingPingId === device.id ? <Loader2 className="size-3.5 animate-spin" /> : <Radio className="size-3.5" />}
                        Ping Terminal
                      </Button>
                      <Button
                        size="sm"
                        disabled={syncingDeviceId === device.id}
                        onClick={() => triggerSync(device)}
                        className="gap-1.5 flex-1"
                      >
                        {syncingDeviceId === device.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                        Sync Now
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: EMPLOYEE PUNCH LOGS */}
          <TabsContent value="punches" className="mt-4 space-y-4">
            <Card className="p-4 border border-border/80 rounded-xl bg-card shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Synced Employee Punch Logs</h3>
                  <p className="text-xs text-muted-foreground">Live biometric punches captured via ADMS Cloud Push, LAN TCP, or USB log import.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      value={searchPunch}
                      onChange={(e) => setSearchPunch(e.target.value)}
                      placeholder="Search name, code..."
                      className="h-8 pl-8 w-44 text-xs"
                    />
                  </div>
                  <Select value={filterRegistration} onValueChange={(v: any) => setFilterRegistration(v)}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="registered">Registered Only</SelectItem>
                      <SelectItem value="unregistered">Unregistered Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPunchType} onValueChange={setFilterPunchType}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Punches</SelectItem>
                      <SelectItem value="in">Clock In</SelectItem>
                      <SelectItem value="out">Clock Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredPunches.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-border/80 rounded-lg space-y-2">
                  <Fingerprint className="size-8 text-muted-foreground/50 mx-auto" />
                  <p className="text-sm font-semibold">No biometric punches recorded yet</p>
                  <p className="text-xs text-muted-foreground">
                    Configure ADMS Push with Master HRMS Device Manager or import an `attlog.dat` USB file.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/80">
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Employee</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Code</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Terminal</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Type</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Mode</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Timestamp</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPunches.map((p) => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                          <td className="p-3 font-medium">
                            <div>{p.employeeName}</div>
                            <div className="text-[11px] text-muted-foreground">{p.department}</div>
                          </td>
                          <td className="p-3 tabular-nums text-xs font-semibold">{p.employeeCode}</td>
                          <td className="p-3 text-xs">{p.deviceName}</td>
                          <td className="p-3">
                            <Badge variant={p.punchType === "Clock In" ? "success" : "info"}>{p.punchType}</Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{p.verificationMode}</td>
                          <td className="p-3 text-xs tabular-nums">{p.timestamp}</td>
                          <td className="p-3 text-right">
                            {p.isRegistered ? (
                              <Badge variant="success" className="gap-1">
                                <CheckCircle2 className="size-3" /> Synced
                              </Badge>
                            ) : (
                              <Button size="xs" variant="outline" onClick={() => openQuickRegister(p)} className="gap-1">
                                <UserPlus className="size-3" /> Register Staff
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 3: HARDWARE USERS, AUTH MODES & EMPLOYEE MAPPING */}
          <TabsContent value="mapping" className="mt-4 space-y-4">
            {/* Hardware Enrolled Users & Auth Modes Table */}
            <Card className="p-5 border border-border/80 rounded-xl bg-card shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-base font-semibold">Biometric Machine Users, Auth Modes & HRMS Matching</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Shows every user pulled from the biometric machine along with their unlock modes (Fingerprint, Face, RFID Card, PIN). Match existing employees or register new ones in 1 click.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {devices.length > 0 && (
                    <Select value={activeMappingDeviceId} onValueChange={setSelectedMappingDeviceId}>
                      <SelectTrigger className="w-56 h-9 text-xs">
                        <SelectValue placeholder="Select Biometric Device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} {d.serialNumber ? `(${d.serialNumber})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isFetchingHardwareUsers || !activeMappingDeviceId}
                    onClick={() => refetchHardwareUsers()}
                    className="gap-1.5 h-9"
                  >
                    <RefreshCw className={`size-3.5 ${isFetchingHardwareUsers ? "animate-spin" : ""}`} />
                    Fetch Hardware Users
                  </Button>
                </div>
              </div>

              {hardwareUsers.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-border/80 rounded-lg space-y-2">
                  <Fingerprint className="size-8 text-muted-foreground/50 mx-auto" />
                  <p className="text-sm font-semibold">No hardware users fetched yet for this terminal</p>
                  <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                    Click <strong>Fetch Hardware Users</strong> (if server is on the same LAN) or open <strong>MasterHRMS-Device-Manager.exe → Pull Users, Modes & Logs → Push to Master HRMS</strong>.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/80">
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Hardware ID (PIN)</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Machine Name</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Auth Modes (Unlock)</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">HRMS Match Status</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hardwareUsers.map((u: any) => (
                        <tr key={u.biometricId} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                          <td className="p-3 font-semibold tabular-nums">{u.biometricId}</td>
                          <td className="p-3 font-medium">
                            <div>{u.name}</div>
                            {u.cardNumber && <div className="text-[11px] text-muted-foreground tabular-nums">Card: {u.cardNumber}</div>}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1.5">
                              {(u.authModes || ["Fingerprint"]).map((mode: string) => (
                                <Badge
                                  key={mode}
                                  variant={
                                    mode === "Face"
                                      ? "purple"
                                      : mode === "RFID Card"
                                        ? "info"
                                        : mode === "PIN"
                                          ? "warning"
                                          : "soft"
                                  }
                                  className="text-[11px]"
                                >
                                  {mode === "Fingerprint" && u.fingerprintCount > 0 ? `Fingerprint (${u.fingerprintCount})` : mode}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            {u.isMatched && u.matchedEmployee ? (
                              <div className="space-y-0.5">
                                <Badge variant="success" className="gap-1">
                                  <CheckCircle2 className="size-3" /> {u.matchedEmployee.name}
                                </Badge>
                                <div className="text-[11px] text-muted-foreground tabular-nums">
                                  Code: {u.matchedEmployee.employeeCode} ({u.matchType === "pin_mapping" ? "Pinned" : "Code Match"})
                                </div>
                              </div>
                            ) : (
                              <Badge variant="warning">Not in HRMS</Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {u.isMatched && u.matchedEmployee ? (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => router.push(`/hr/employees/${u.matchedEmployee.id}/edit`)}
                                className="gap-1"
                              >
                                <ExternalLink className="size-3" /> Edit Profile
                              </Button>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <Select
                                  value={inlineLinkSelection[u.biometricId] || ""}
                                  onValueChange={(val) =>
                                    setInlineLinkSelection((prev) => ({ ...prev, [u.biometricId]: val }))
                                  }
                                >
                                  <SelectTrigger className="h-7 w-40 text-xs">
                                    <SelectValue placeholder="Match employee..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dbEmployees.map((emp: any) => (
                                      <SelectItem key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName} ({emp.employeeCode || "—"})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  disabled={!inlineLinkSelection[u.biometricId]}
                                  onClick={() => linkHardwareUserToEmployee(u.biometricId, inlineLinkSelection[u.biometricId])}
                                >
                                  Link
                                </Button>
                                <Button size="xs" onClick={() => openQuickRegisterFromHardwareUser(u)} className="gap-1">
                                  <UserPlus className="size-3" /> Register New
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Manual PIN Mapping Card */}
            <Card className="p-5 border border-border/80 rounded-xl bg-card shadow-xs space-y-4">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-base font-semibold">Manual Employee Biometric PIN Mapping</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Explicitly bind any hardware User ID / PIN to a Master HRMS employee record.
                </p>
              </div>

              {/* Add Mapping Form */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-muted/30 p-3.5 rounded-lg border border-border/70">
                <div className="md:col-span-5 space-y-1">
                  <Label className="text-xs">Select Master HRMS Employee</Label>
                  <Select value={mappingEmployeeId} onValueChange={setMappingEmployeeId}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Choose employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dbEmployees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode || "No Code"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-4 space-y-1">
                  <Label className="text-xs">Biometric Machine User ID / PIN</Label>
                  <Input
                    value={mappingDevicePin}
                    onChange={(e) => setMappingDevicePin(e.target.value)}
                    placeholder="e.g. 1, 101, 205"
                    className="h-9 text-xs bg-background"
                  />
                </div>
                <div className="md:col-span-3">
                  <Button
                    size="sm"
                    onClick={saveEmployeeMapping}
                    disabled={isSavingMapping || !activeMappingDeviceId}
                    className="w-full h-9 gap-1.5"
                  >
                    {isSavingMapping ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
                    Map Employee
                  </Button>
                </div>
              </div>

              {/* Existing Mappings Table */}
              {deviceMappings.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-border/80 rounded-lg space-y-1.5">
                  <p className="text-sm font-semibold">No custom PIN mappings yet</p>
                  <p className="text-xs text-muted-foreground">
                    If your biometric User IDs already match Master HRMS Employee Codes (e.g. 101 &harr; EMP-101), punches map automatically with zero setup.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/80">
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Hardware PIN / User ID</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">Employee Name</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-left">HRMS Employee Code</th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceMappings.map((m: any) => (
                        <tr key={m.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                          <td className="p-3 font-semibold tabular-nums">{m.devicePin}</td>
                          <td className="p-3 font-medium">
                            {m.employee ? `${m.employee.firstName} ${m.employee.lastName}` : "Unknown"}
                          </td>
                          <td className="p-3 text-xs tabular-nums text-muted-foreground">
                            {m.employee?.employeeCode || "—"}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="xs"
                              variant="ghost"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => deleteEmployeeMapping(m.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 4: ADMS CLOUD & MASTER HRMS DEVICE MANAGER SETUP */}
          <TabsContent value="setup" className="mt-4 space-y-4">
            <Card className="p-5 border border-border/80 rounded-xl bg-card shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-base font-semibold">Master HRMS Device Manager — ADMS Cloud Push Setup</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Point any ZKTeco, eSSL, or Realtime biometric machine directly to Master HRMS in 4 steps.
                  </p>
                </div>
                <Button size="sm" asChild className="gap-1.5 shrink-0">
                  <a href="/downloads/MasterHRMS-Device-Manager-CrossPlatform.zip" download>
                    <Download className="size-4" /> Download Cross-Platform Manager (Win / Mac / Linux)
                  </a>
                </Button>
              </div>

              {/* Copyable Cloud Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">ADMS Push Server Host (Hostname Only)</div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-semibold text-sm tabular-nums">{admsHost}</span>
                    <Button size="xs" variant="ghost" onClick={() => copyValue("ADMS Host", admsHost)}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Do NOT add https:// or /iclock/cdata — ZKTeco appends it automatically.</p>
                </div>

                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">ADMS Server Port (HTTP)</div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-semibold text-sm tabular-nums">{admsPort}</span>
                    <Button size="xs" variant="ghost" onClick={() => copyValue("ADMS Port", admsPort)}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Use port 80 for cloud production (or 5000 when testing on local LAN server).</p>
                </div>

                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Generic JSON Webhook URL</div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-semibold text-xs truncate">
                      {cloudConfig?.genericWebhookUrl || `https://${admsHost}/api/public/biometric/push`}
                    </span>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        copyValue("Webhook URL", cloudConfig?.genericWebhookUrl || `https://${admsHost}/api/public/biometric/push`)
                      }
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">For Hikvision / custom middleware HTTP webhook integrations.</p>
                </div>
              </div>

              {/* 4-Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    step: "Step 1",
                    title: "Run Device Manager",
                    desc: "Unzip MasterHRMS-Device-Manager.zip on a Windows PC on the same LAN and click Register 64-bit SDK DLLs.",
                  },
                  {
                    step: "Step 2",
                    title: "Connect & Copy SN",
                    desc: "Enter your machine LAN IP (e.g. 10.10.10.215) + Port 4370, click Connect, and copy the hardware Serial Number.",
                  },
                  {
                    step: "Step 3",
                    title: "Push ADMS Config",
                    desc: `Set ADMS URL to ${admsHost} and Port ${admsPort}, click Update Device Settings, then Restart Device.`,
                  },
                  {
                    step: "Step 4",
                    title: "Register SN Here",
                    desc: "Click Register Hardware above, paste the exact Serial Number (SN), and punch to see live attendance sync.",
                  },
                ].map((s) => (
                  <div key={s.step} className="p-4 rounded-xl border border-border/80 bg-background space-y-1.5">
                    <Badge variant="soft" className="text-[10px]">{s.step}</Badge>
                    <h4 className="text-sm font-semibold">{s.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* REGISTER / EDIT BIOMETRIC TERMINAL MODAL */}
        <Dialog open={isDeviceModalOpen} onOpenChange={setIsDeviceModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Fingerprint className="size-5 text-primary" />
                {editingDeviceId ? "Edit Biometric Terminal" : "Register Biometric Terminal"}
              </DialogTitle>
              <DialogDescription>
                Enter the hardware Serial Number (SN) from Master HRMS Device Manager so ADMS cloud punches link to your workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bio-name">Terminal Name *</Label>
                  <Input
                    id="bio-name"
                    placeholder="e.g. Main Entrance ZKTeco"
                    value={deviceForm.name}
                    onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio-sn">Hardware Serial Number (SN) *</Label>
                  <Input
                    id="bio-sn"
                    placeholder="e.g. CGKK212461260"
                    value={deviceForm.serialNumber}
                    onChange={(e) => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Hardware Model</Label>
                  <Select value={deviceForm.model} onValueChange={(v) => setDeviceForm({ ...deviceForm, model: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_MODELS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sync Protocol</Label>
                  <Select value={deviceForm.syncProtocol} onValueChange={(v) => setDeviceForm({ ...deviceForm, syncProtocol: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYNC_PROTOCOLS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="bio-ip">Local LAN IP Address</Label>
                  <Input
                    id="bio-ip"
                    placeholder="10.10.10.215"
                    value={deviceForm.ip}
                    onChange={(e) => setDeviceForm({ ...deviceForm, ip: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio-port">TCP Port</Label>
                  <Input
                    id="bio-port"
                    type="number"
                    value={deviceForm.port}
                    onChange={(e) => setDeviceForm({ ...deviceForm, port: Number(e.target.value) || 4370 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Device Purpose</Label>
                  <Select value={deviceForm.purpose} onValueChange={(v) => setDeviceForm({ ...deviceForm, purpose: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_PURPOSES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio-loc">Location / Office Branch</Label>
                  <Input
                    id="bio-loc"
                    placeholder="Main Entrance"
                    value={deviceForm.location}
                    onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeviceModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveDevice} disabled={isSavingDevice}>
                {isSavingDevice && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                {editingDeviceId ? "Save Changes" : "Register Hardware"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* IMPORT USB LOG MODAL */}
        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Biometric USB Log File</DialogTitle>
              <DialogDescription>
                File loaded: <strong>{importFileName}</strong> ({importFileContent.split(/\r?\n/).filter((l) => l.trim()).length} lines)
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
              <Button onClick={processImportedFile}>Import Punches</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* QUICK REGISTER UNMATCHED STAFF MODAL */}
        <Dialog open={!!quickRegModalPunch} onOpenChange={(o) => !o && setQuickRegModalPunch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register Biometric User ({quickRegModalPunch?.employeeCode})</DialogTitle>
              <DialogDescription>
                Create an employee profile linked to hardware code <strong>{quickRegModalPunch?.employeeCode}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>First Name *</Label>
                  <Input value={quickRegForm.firstName} onChange={(e) => setQuickRegForm({ ...quickRegForm, firstName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Last Name *</Label>
                  <Input value={quickRegForm.lastName} onChange={(e) => setQuickRegForm({ ...quickRegForm, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={quickRegForm.email} onChange={(e) => setQuickRegForm({ ...quickRegForm, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Select
                    value={quickRegForm.departmentId}
                    onValueChange={(v) => setQuickRegForm({ ...quickRegForm, departmentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dbDepartments.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Designation</Label>
                  {dbDesignations.length > 0 ? (
                    <Select
                      value={quickRegForm.position}
                      onValueChange={(v) => setQuickRegForm({ ...quickRegForm, position: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation..." />
                      </SelectTrigger>
                      <SelectContent>
                        {dbDesignations.map((desig: any) => (
                          <SelectItem key={desig.id} value={desig.name}>
                            {desig.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={quickRegForm.position}
                      onChange={(e) => setQuickRegForm({ ...quickRegForm, position: e.target.value })}
                      placeholder="e.g. Software Engineer"
                    />
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => setQuickRegModalPunch(null)}>Cancel</Button>
              <Button variant="secondary" onClick={() => handleQuickRegister(false)} disabled={isRegisteringUser}>
                {isRegisteringUser && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                Create &amp; Link
              </Button>
              <Button onClick={() => handleQuickRegister(true)} disabled={isRegisteringUser} className="gap-1.5">
                {isRegisteringUser ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-3.5" />}
                Create &amp; Edit Full Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}

export default BiometricSyncConsole;
