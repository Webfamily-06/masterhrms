'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function HrAttendancePoliciesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    workingDays: "Mon,Tue,Wed,Thu,Fri",
    graceMinutes: 15,
    halfDayHours: 4.0,
    fullDayHours: 8.0,
    isOvertimeAllowed: true,
    overtimeMultiplier: 1.5,
    minOvertimeMinutes: 60,
    regularizationLimit: 3,
    isDefault: false,
  });

  // 1. Fetch Policies
  const { data: policies = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-attendance-policies"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/policies");
      return res.data;
    },
  });

  // Mutation: Save Policy (Create or Update)
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (editingPolicy?.id) {
        const res = await api.put(`/api/v1/hr/attendance/policies/${editingPolicy.id}`, payload);
        return res.data;
      } else {
        const res = await api.post("/api/v1/hr/attendance/policies", payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingPolicy ? "Attendance policy updated successfully" : "Attendance policy published successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-policies"] });
      setModalOpen(false);
      setEditingPolicy(null);
      setForm({
        name: "",
        code: "",
        description: "",
        workingDays: "Mon,Tue,Wed,Thu,Fri",
        graceMinutes: 15,
        halfDayHours: 4.0,
        fullDayHours: 8.0,
        isOvertimeAllowed: true,
        overtimeMultiplier: 1.5,
        minOvertimeMinutes: 60,
        regularizationLimit: 3,
        isDefault: false,
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to save policy"),
  });

  // Mutation: Delete Policy
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/hr/attendance/policies/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Attendance policy deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-policies"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to delete policy"),
  });

  // Calculations for KPI Cards
  const defaultPolicy = policies.find((p: any) => p.isDefault) || policies[0];
  const avgGrace = policies.length > 0 ? Math.round(policies.reduce((a: number, b: any) => a + (b.graceMinutes || 0), 0) / policies.length) : 15;
  const avgOvertime = policies.length > 0 ? (policies.reduce((a: number, b: any) => a + Number(b.overtimeMultiplier || 1.5), 0) / policies.length).toFixed(1) : "1.5";

  const filteredPolicies = policies.filter((p: any) => {
    if (searchTerm) {
      const name = (p.name || "").toLowerCase();
      const code = (p.code || "").toLowerCase();
      const s = searchTerm.toLowerCase();
      if (!name.includes(s) && !code.includes(s)) return false;
    }
    return true;
  });

  const handleOpenEdit = (policy: any) => {
    setEditingPolicy(policy);
    setForm({
      name: policy.name,
      code: policy.code,
      description: policy.description || "",
      workingDays: policy.workingDays || "Mon,Tue,Wed,Thu,Fri",
      graceMinutes: policy.graceMinutes || 15,
      halfDayHours: Number(policy.halfDayHours || 4.0),
      fullDayHours: Number(policy.fullDayHours || 8.0),
      isOvertimeAllowed: policy.isOvertimeAllowed !== false,
      overtimeMultiplier: Number(policy.overtimeMultiplier || 1.5),
      minOvertimeMinutes: policy.minOvertimeMinutes || 60,
      regularizationLimit: policy.regularizationLimit || 3,
      isDefault: !!policy.isDefault,
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Attendance Policies"
        description="Versioned attendance guidelines, grace thresholds, working day schedules, and calculation rules."
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setEditingPolicy(null);
              setForm({
                name: "",
                code: "",
                description: "",
                workingDays: "Mon,Tue,Wed,Thu,Fri",
                graceMinutes: 15,
                halfDayHours: 4.0,
                fullDayHours: 8.0,
                isOvertimeAllowed: true,
                overtimeMultiplier: 1.5,
                minOvertimeMinutes: 60,
                regularizationLimit: 3,
                isDefault: false,
              });
              setModalOpen(true);
            }}
            className="gap-1.5 text-xs font-medium"
          >
            <Plus className="w-4 h-4" />
            New Policy
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="text-xs">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* KPI Summary Cards (Reference Screenshot 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Policies"
          value={policies.length}
          icon={<ShieldCheck className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          label="Active Policies"
          value={policies.length}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          className="border-emerald-200 bg-emerald-50/20"
        />
        <StatCard
          label="Average Late Grace"
          value={`${avgGrace} mins`}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          className="border-amber-200 bg-amber-50/20"
        />
        <StatCard
          label="Average Overtime Rate"
          value={`${avgOvertime}x`}
          icon={<Sliders className="w-5 h-5 text-purple-500" />}
        />
      </div>

      {/* Search Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search policy name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Policy Cards Grid (Reference Screenshot 5) */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          Loading attendance policies...
        </div>
      ) : filteredPolicies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No attendance policies found. Click "New Policy" to configure one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((policy: any) => (
            <Card key={policy.id} className="overflow-hidden border shadow-xs hover:shadow-sm transition-shadow">
              <CardHeader className="p-4 pb-3 border-b bg-muted/15 flex flex-row items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-foreground">{policy.name}</h4>
                    {policy.isDefault && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800 text-[10px]">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {policy.code} • v{policy.version || 1}
                  </p>
                </div>

                <Badge variant="outline" className="text-[10px] bg-background">
                  Active
                </Badge>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5 text-xs">
                {/* Working Days */}
                <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Working Days</span>
                  <span className="font-semibold text-foreground">{policy.workingDays}</span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded border bg-card">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Late Grace</p>
                    <p className="text-sm font-bold text-amber-600 mt-0.5">{policy.graceMinutes || 15} mins</p>
                  </div>
                  <div className="p-2 rounded border bg-card">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Overtime Rate</p>
                    <p className="text-sm font-bold text-purple-600 mt-0.5">{Number(policy.overtimeMultiplier || 1.5)}x</p>
                  </div>
                  <div className="p-2 rounded border bg-card">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Standard Day</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{Number(policy.fullDayHours || 8.0)} hrs</p>
                  </div>
                  <div className="p-2 rounded border bg-card">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Half Day</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{Number(policy.halfDayHours || 4.0)} hrs</p>
                  </div>
                </div>

                {/* Description */}
                {policy.description && (
                  <p className="text-muted-foreground text-[11px] line-clamp-2">
                    {policy.description}
                  </p>
                )}

                {/* Actions Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-[10px] text-muted-foreground">
                    Regularizations: max {policy.regularizationLimit || 3}/mo
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(policy)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {!policy.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(policy.id)}
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: Create / Edit Policy */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {editingPolicy ? "Edit Attendance Policy" : "Create Attendance Policy"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure grace periods, working days, and overtime calculation rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Policy Name *</label>
              <Input
                placeholder="e.g. Corporate Standard, Field Operations..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Policy Code</label>
                <Input
                  placeholder="e.g. POL-CORP-01"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Working Days</label>
                <Input
                  placeholder="Mon,Tue,Wed,Thu,Fri"
                  value={form.workingDays}
                  onChange={(e) => setForm({ ...form, workingDays: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Grace Period (mins)</label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={form.graceMinutes}
                  onChange={(e) => setForm({ ...form, graceMinutes: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Overtime Multiplier</label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="3"
                  value={form.overtimeMultiplier}
                  onChange={(e) => setForm({ ...form, overtimeMultiplier: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Full Day Threshold (hrs)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.fullDayHours}
                  onChange={(e) => setForm({ ...form, fullDayHours: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Half Day Threshold (hrs)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.halfDayHours}
                  onChange={(e) => setForm({ ...form, halfDayHours: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Description</label>
              <Input
                placeholder="Optional description of this policy and applicable teams..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefaultPolicy"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="isDefaultPolicy" className="text-xs text-foreground font-medium">
                Set as Active Default Policy for Tenant
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.name || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : editingPolicy ? "Update Policy" : "Publish Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
