import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Fingerprint,
  Wifi,
  WifiOff,
  Server,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/attendance/devices")({
  component: HrAttendanceDevicesPage,
});

export default function HrAttendanceDevicesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deviceForm, setDeviceForm] = useState({
    deviceName: "",
    deviceModel: "ZKTeco MB20",
    deviceType: "hybrid",
    ipAddress: "192.168.1.100",
    port: 4370,
    serialNumber: "",
    location: "Main Entrance",
  });

  const { data: devices = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-biometric-devices"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/devices");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/hr/attendance/devices", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Biometric device registered successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-biometric-devices"] });
      setModalOpen(false);
      setDeviceForm({
        deviceName: "",
        deviceModel: "ZKTeco MB20",
        deviceType: "hybrid",
        ipAddress: "192.168.1.100",
        port: 4370,
        serialNumber: "",
        location: "Main Entrance",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to register device"),
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/hr/attendance/devices/${id}/sync`, {});
      return res.data;
    },
    onSuccess: () => {
      toast.success("Device sync triggered successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-biometric-devices"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Device sync failed"),
  });

  const onlineCount = devices.filter((d: any) => d.status === "online").length;
  const offlineCount = devices.filter((d: any) => d.status !== "online").length;
  const totalPunches = devices.reduce((acc: number, d: any) => acc + (d.totalPunchLogs || 0), 0);

  const filtered = devices.filter((d: any) => {
    if (searchTerm) {
      const name = (d.deviceName || "").toLowerCase();
      const loc = (d.location || "").toLowerCase();
      const sn = (d.serialNumber || "").toLowerCase();
      const s = searchTerm.toLowerCase();
      if (!name.includes(s) && !loc.includes(s) && !sn.includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biometric Devices & Hardware"
        description="Monitor physical biometric attendance terminals, network health, and sync logs."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Terminal
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Registered Devices" value={devices.length} icon={<Server className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Online Terminals" value={onlineCount} icon={<Wifi className="w-5 h-5 text-emerald-500" />} className="border-emerald-200 bg-emerald-50/20" />
        <StatCard label="Offline / Warning" value={offlineCount} icon={<WifiOff className="w-5 h-5 text-rose-500" />} className="border-rose-200 bg-rose-50/20" />
        <StatCard label="Total Logged Punches" value={totalPunches} icon={<Fingerprint className="w-5 h-5 text-purple-500" />} />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base font-semibold">Terminal Network Registry</CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search device name, location, serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 w-64 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4 text-left">Device</th>
                  <th className="py-3 px-4 text-left">Type / Model</th>
                  <th className="py-3 px-4 text-left">Location</th>
                  <th className="py-3 px-4 text-left">IP & Port</th>
                  <th className="py-3 px-4 text-left">Serial No.</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Last Sync</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No biometric devices found
                    </td>
                  </tr>
                ) : (
                  filtered.map((d: any) => (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{d.deviceName}</td>
                      <td className="py-3 px-4">
                        <div>{d.deviceModel}</div>
                        <div className="text-xs text-muted-foreground capitalize">{d.deviceType}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">{d.location}</td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {d.ipAddress}:{d.port}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {d.serialNumber}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={d.status === "online" ? "default" : "destructive"}
                          className="capitalize text-xs"
                        >
                          {d.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString() : "Never"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => syncMutation.mutate(d.id)}
                          disabled={syncMutation.isPending}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                          Sync
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Add Terminal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Biometric Terminal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold">Device Name</label>
              <Input
                placeholder="e.g. Ground Floor Turnstile"
                value={deviceForm.deviceName}
                onChange={(e) => setDeviceForm({ ...deviceForm, deviceName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Model</label>
                <Input
                  value={deviceForm.deviceModel}
                  onChange={(e) => setDeviceForm({ ...deviceForm, deviceModel: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Serial Number</label>
                <Input
                  placeholder="e.g. SN-883921"
                  value={deviceForm.serialNumber}
                  onChange={(e) => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">IP Address</label>
                <Input
                  placeholder="192.168.1.100"
                  value={deviceForm.ipAddress}
                  onChange={(e) => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Port</label>
                <Input
                  type="number"
                  value={deviceForm.port}
                  onChange={(e) => setDeviceForm({ ...deviceForm, port: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold">Physical Location</label>
              <Input
                placeholder="e.g. Server Room Entrance"
                value={deviceForm.location}
                onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(deviceForm)}
              disabled={!deviceForm.deviceName || createMutation.isPending}
            >
              Register Terminal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
