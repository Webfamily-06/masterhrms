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
  ShieldCheck,
  Clock,
  CalendarCheck,
  Plus,
  RefreshCw,
  Sliders,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/attendance/policies")({
  component: HrAttendancePoliciesPage,
});

export default function HrAttendancePoliciesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    workingDays: "Mon,Tue,Wed,Thu,Fri",
    graceMinutes: 15,
    halfDayHours: 4.0,
    fullDayHours: 8.0,
    isDefault: false,
  });

  const { data: policies = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-attendance-policies"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/policies");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/hr/attendance/policies", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Attendance policy published successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-policies"] });
      setModalOpen(false);
      setForm({
        name: "",
        code: "",
        workingDays: "Mon,Tue,Wed,Thu,Fri",
        graceMinutes: 15,
        halfDayHours: 4.0,
        fullDayHours: 8.0,
        isDefault: false,
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to create policy"),
  });

  const defaultPolicy = policies.find((p: any) => p.isDefault) || policies[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Policies"
        description="Versioned attendance guidelines, grace thresholds, working day schedules, and calculation rules."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Policy
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Policies" value={policies.length} icon={<ShieldCheck className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Active Default" value={defaultPolicy?.name || "Corporate Standard"} icon={<Sliders className="w-5 h-5 text-emerald-500" />} />
        <StatCard label="Grace Period" value={`${defaultPolicy?.graceMinutes || 15} mins`} icon={<Clock className="w-5 h-5 text-amber-500" />} />
        <StatCard label="Standard Day" value={`${defaultPolicy?.fullDayHours || 8} hrs`} icon={<CalendarCheck className="w-5 h-5 text-purple-500" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {policies.map((p: any) => (
          <Card key={p.id} className="relative overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.code}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    v{p.version || 1}
                  </Badge>
                  {p.isDefault && (
                    <Badge variant="default" className="text-xs bg-emerald-600">
                      Default
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/40 rounded">
                  <span className="text-muted-foreground block">Grace Threshold:</span>
                  <span className="font-semibold text-foreground">{p.graceMinutes} Minutes</span>
                </div>
                <div className="p-2 bg-muted/40 rounded">
                  <span className="text-muted-foreground block">Half-Day Min:</span>
                  <span className="font-semibold text-foreground">{p.halfDayHours} Hours</span>
                </div>
                <div className="p-2 bg-muted/40 rounded">
                  <span className="text-muted-foreground block">Full-Day Min:</span>
                  <span className="font-semibold text-foreground">{p.fullDayHours} Hours</span>
                </div>
                <div className="p-2 bg-muted/40 rounded">
                  <span className="text-muted-foreground block">Work Days:</span>
                  <span className="font-semibold text-foreground truncate block">{p.workingDays}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground pt-1 border-t flex justify-between">
                <span>Created {new Date(p.createdAt).toLocaleDateString()}</span>
                <span className="font-mono text-emerald-600">Locked on Effective Date</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal: Create Policy */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Attendance Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold">Policy Name</label>
              <Input
                placeholder="e.g. Standard Corporate Policy"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Policy Code</label>
                <Input
                  placeholder="e.g. POL-CORP-01"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Grace Window (Mins)</label>
                <Input
                  type="number"
                  value={form.graceMinutes}
                  onChange={(e) => setForm({ ...form, graceMinutes: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Half-Day Threshold (Hrs)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.halfDayHours}
                  onChange={(e) => setForm({ ...form, halfDayHours: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Full-Day Threshold (Hrs)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.fullDayHours}
                  onChange={(e) => setForm({ ...form, fullDayHours: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold">Working Days</label>
              <Input
                placeholder="Mon,Tue,Wed,Thu,Fri"
                value={form.workingDays}
                onChange={(e) => setForm({ ...form, workingDays: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="isDefault" className="text-xs font-medium cursor-pointer">
                Set as Default Company Policy
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || createMutation.isPending}
            >
              Publish Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
