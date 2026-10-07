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
  Layers,
  Plus,
  RefreshCw,
  Coins,
  CalendarDays,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/leave/types")({
  component: HrLeaveTypesPage,
});

export default function HrLeaveTypesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    daysPerYear: 12,
    color: "blue",
    isPaid: true,
    sandwichRule: false,
    halfDayAllowed: true,
  });

  const { data: types = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-leave-types"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/types");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/hr/leave/types", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Leave category created successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-types"] });
      setModalOpen(false);
      setForm({
        name: "",
        code: "",
        daysPerYear: 12,
        color: "blue",
        isPaid: true,
        sandwichRule: false,
        halfDayAllowed: true,
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to create leave type"),
  });

  const paidCount = types.filter((t: any) => t.isPaid).length;
  const unpaidCount = types.filter((t: any) => !t.isPaid).length;
  const avgQuota = types.length > 0
    ? Math.round(types.reduce((acc: number, t: any) => acc + Number(t.daysPerYear || 0), 0) / types.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Types Master"
        description="Configure tenant leave types, annual allocation limits, paid policies, and sandwich rules."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Leave Type
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Categories" value={types.length} icon={<Layers className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Paid Leave Types" value={paidCount} icon={<Coins className="w-5 h-5 text-emerald-500" />} className="border-emerald-200 bg-emerald-50/20" />
        <StatCard label="Unpaid Types" value={unpaidCount} icon={<ShieldAlert className="w-5 h-5 text-amber-500" />} className="border-amber-200 bg-amber-50/20" />
        <StatCard label="Average Quota" value={`${avgQuota} days/yr`} icon={<CalendarDays className="w-5 h-5 text-purple-500" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {types.map((t: any) => (
          <Card key={t.id} className="relative overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t.name}</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{t.code}</p>
                </div>
                <Badge variant={t.isPaid ? "default" : "secondary"} className="capitalize text-xs">
                  {t.isPaid ? "Paid" : "Unpaid"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="text-2xl font-bold font-mono tracking-tight text-primary">
                {t.daysPerYear} <span className="text-xs font-normal text-muted-foreground">days / year</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div className="p-2 bg-muted/40 rounded">
                  <span className="text-muted-foreground block">Sandwich Rule:</span>
                  <span className="font-semibold">{t.sandwichRule ? "Enabled" : "Disabled"}</span>
                </div>
                <div className="p-2 bg-muted/40 rounded">
                  <span className="text-muted-foreground block">Half-Day:</span>
                  <span className="font-semibold">{t.halfDayAllowed ? "Allowed" : "Prohibited"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal: Create Leave Type */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Leave Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold">Category Name</label>
              <Input
                placeholder="e.g. Casual Leave"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Category Code</label>
                <Input
                  placeholder="e.g. CL"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Days Per Year</label>
                <Input
                  type="number"
                  value={form.daysPerYear}
                  onChange={(e) => setForm({ ...form, daysPerYear: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPaid"
                  checked={form.isPaid}
                  onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isPaid" className="text-xs font-medium cursor-pointer">
                  Paid Leave (Entitled to full daily salary compensation)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sandwichRule"
                  checked={form.sandwichRule}
                  onChange={(e) => setForm({ ...form, sandwichRule: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="sandwichRule" className="text-xs font-medium cursor-pointer">
                  Sandwich Rule (Count weekends/holidays if flanked by leave)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halfDayAllowed"
                  checked={form.halfDayAllowed}
                  onChange={(e) => setForm({ ...form, halfDayAllowed: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="halfDayAllowed" className="text-xs font-medium cursor-pointer">
                  Allow Half-Day Applications
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
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
