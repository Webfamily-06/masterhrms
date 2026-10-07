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
  Scale,
  Plus,
  RefreshCw,
  Search,
  BookOpenCheck,
  Users,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/leave/balances")({
  component: HrLeaveBalancesPage,
});

export default function HrLeaveBalancesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    entryType: "CREDIT",
    days: 1,
    notes: "",
  });

  const { data: balances = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-leave-balances"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/balances");
      return res.data;
    },
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["hr-leave-types"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/types");
      return res.data;
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/hr/leave/balances/adjust", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Leave balance adjusted and immutable ledger entry recorded");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      setAdjustModalOpen(false);
      setForm({ employeeId: "", leaveTypeId: "", entryType: "CREDIT", days: 1, notes: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to adjust balance"),
  });

  const filtered = balances.filter((b: any) => {
    if (searchTerm) {
      const name = (b.employeeName || "").toLowerCase();
      const code = (b.employeeCode || "").toLowerCase();
      const dept = (b.department || "").toLowerCase();
      const s = searchTerm.toLowerCase();
      if (!name.includes(s) && !code.includes(s) && !dept.includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Balances & Ledger"
        description="Audit employee leave quotas derived from the immutable LeaveLedgerEntry ledger."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAdjustModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Manual Adjustment
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Employees Tracked" value={balances.length} icon={<Users className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Leave Categories" value={leaveTypes.length} icon={<Layers className="w-5 h-5 text-emerald-500" />} />
        <StatCard label="Ledger Source" value="Postgres Ledger" icon={<BookOpenCheck className="w-5 h-5 text-purple-500" />} />
        <StatCard label="Audit Safety" value="Reversible" icon={<Scale className="w-5 h-5 text-amber-500" />} />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base font-semibold">Employee Quota Balances</CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search employee or department..."
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
                  <th className="py-3 px-4 text-left">Employee</th>
                  <th className="py-3 px-4 text-left">Department</th>
                  {leaveTypes.map((lt: any) => (
                    <th key={lt.id} className="py-3 px-4 text-center">
                      {lt.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={2 + leaveTypes.length} className="py-12 text-center text-muted-foreground">
                      No employee balances found
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp: any) => (
                    <tr key={emp.employeeId} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="font-medium">{emp.employeeName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{emp.employeeCode}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{emp.department}</td>
                      {leaveTypes.map((lt: any) => {
                        const bal = emp.balances?.find((b: any) => b.leaveTypeId === lt.id);
                        const val = bal ? bal.balance : 0;
                        return (
                          <td key={lt.id} className="py-3 px-4 text-center">
                            <Badge
                              variant={val > 0 ? "secondary" : "outline"}
                              className="font-mono text-xs"
                            >
                              {val} days
                            </Badge>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Manual Adjustment Modal */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Leave Ledger Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold">Select Employee</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              >
                <option value="">-- Choose Employee --</option>
                {balances.map((b: any) => (
                  <option key={b.employeeId} value={b.employeeId}>
                    {b.employeeName} ({b.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold">Leave Type</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={form.leaveTypeId}
                onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              >
                <option value="">-- Choose Leave Type --</option>
                {leaveTypes.map((lt: any) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Adjustment Type</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={form.entryType}
                  onChange={(e) => setForm({ ...form, entryType: e.target.value })}
                >
                  <option value="CREDIT">CREDIT (+)</option>
                  <option value="DEBIT">DEBIT (-)</option>
                  <option value="ACCRUAL">ACCRUAL (+)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold">Days</label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold">Audit Justification Notes (Required)</label>
              <Input
                placeholder="e.g. Compensatory credit approved by Director"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => adjustMutation.mutate(form)}
              disabled={!form.employeeId || !form.leaveTypeId || !form.notes || adjustMutation.isPending}
            >
              Post Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
