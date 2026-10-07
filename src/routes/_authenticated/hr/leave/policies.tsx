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
  FileText,
  Plus,
  RefreshCw,
  Bell,
  CalendarCheck,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/leave/policies")({
  component: HrLeavePoliciesPage,
});

export default function HrLeavePoliciesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    noticeDays: 2,
    maxConsecutiveDays: 14,
    sandwichRule: false,
    allowHalfDay: true,
    accrualFrequency: "MONTHLY",
    isDefault: false,
  });

  const { data: policies = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-leave-policies"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/policies");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/hr/leave/policies", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Leave policy published successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-policies"] });
      setModalOpen(false);
      setForm({
        name: "",
        code: "",
        noticeDays: 2,
        maxConsecutiveDays: 14,
        sandwichRule: false,
        allowHalfDay: true,
        accrualFrequency: "MONTHLY",
        isDefault: false,
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to create policy"),
  });

  const defaultPolicy = policies.find((p: any) => p.isDefault) || policies[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Policies"
        description="Versioned employee leave rules, notice requirements, accrual cycles, and consecutive day caps."
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
        <StatCard label="Total Policies" value={policies.length} icon={<FileText className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Default Policy" value={defaultPolicy?.name || "Corporate Standard"} icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />} />
        <StatCard label="Notice Period" value={`${defaultPolicy?.noticeDays || 2} Days`} icon={<Bell className="w-5 h-5 text-amber-500" />} />
        <StatCard label="Max Consecutive" value={`${defaultPolicy?.maxConsecutiveDays || 14} Days`} icon={<CalendarCheck className="w-5 h-5 text-purple-500" />} />
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
                {p.isDefault && (
                  <Badge variant="default" className="text-xs bg-emerald-600">
                    Default
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/40 rounded">
                  <span className="text-muted-foreground block">Prior Notice:</span>
                  <span className="font-semibold text-foreground">{p.noticeDays} Days</span>
                </div>
                <div className="p-2 bg-muted/40 rounded">
                  <span className="text-muted-foreground block">Max Consecutive:</span>
                  <span className="font-semibold text-foreground">{p.maxConsecutiveDays} Days</span>
                </div>
                <div className="p-2 bg-muted/40 rounded">
                  <span className="text-muted-foreground block">Sandwich Rule:</span>
                  <span className="font-semibold text-foreground">{p.sandwichRule ? "Active" : "None"}</span>
                </div>
                <div className="p-2 bg-muted/40 rounded">
                  <span className="text-muted-foreground block">Accrual Cycle:</span>
                  <span className="font-semibold text-foreground">{p.accrualFrequency}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground pt-1 border-t flex justify-between">
                <span>Created {new Date(p.createdAt).toLocaleDateString()}</span>
                <span className="font-mono text-emerald-600">Effective</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal: Create Policy */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Leave Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold">Policy Name</label>
              <Input
                placeholder="e.g. Standard Corporate Leave Policy"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Policy Code</label>
                <Input
                  placeholder="e.g. LPOL-01"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Notice Required (Days)</label>
                <Input
                  type="number"
                  value={form.noticeDays}
                  onChange={(e) => setForm({ ...form, noticeDays: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Max Consecutive Days</label>
                <Input
                  type="number"
                  value={form.maxConsecutiveDays}
                  onChange={(e) => setForm({ ...form, maxConsecutiveDays: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Accrual Frequency</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={form.accrualFrequency}
                  onChange={(e) => setForm({ ...form, accrualFrequency: e.target.value })}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lp-sandwich"
                  checked={form.sandwichRule}
                  onChange={(e) => setForm({ ...form, sandwichRule: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="lp-sandwich" className="text-xs font-medium cursor-pointer">
                  Enforce Sandwich Rule
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lp-default"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="lp-default" className="text-xs font-medium cursor-pointer">
                  Set as Default Organization Policy
                </label>
              </div>
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
