import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export function WorkspacePolicyDialog({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [policy, setPolicy] = useState({
    planId: tenant.policy?.planId || "",
    status: tenant.policy?.status || "active",
    maxEmployees: tenant.policy?.maxEmployees ?? "",
    maxUsers: tenant.policy?.maxUsers ?? "",
    expiresAt: tenant.policy?.expiresAt?.slice(0, 10) || "",
    billingCycle: tenant.policy?.billingCycle || "monthly",
  });
  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ["workspace-policy-plans"],
    queryFn: async () => (await api.get("/cms/pages/system-monetization-plans"))?.content?.plans || [],
  });
  const save = useMutation({
    mutationFn: () => api.put(`/super/tenants/${tenant.id}/policy`, {
      ...policy, planId: policy.planId || null,
      maxEmployees: policy.maxEmployees === "" ? null : Number(policy.maxEmployees),
      maxUsers: policy.maxUsers === "" ? null : Number(policy.maxUsers),
      expiresAt: policy.expiresAt ? new Date(`${policy.expiresAt}T23:59:59.999Z`).toISOString() : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-tenants"] });
      qc.invalidateQueries({ queryKey: ["super-realtime-stats"] });
      qc.invalidateQueries({ queryKey: ["workspace-subscription"] });
      toast.success("Workspace subscription and limits updated"); onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const selectClass = "w-full h-9 rounded-md border bg-background px-3 text-sm";
  return <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) onClose(); }}>
    <DialogContent>
      <DialogHeader><DialogTitle>{tenant.name}: subscription & limits</DialogTitle>
        <DialogDescription>Platform controls apply to API access and new employee accounts, including imports. Existing records remain available when capacity is reduced.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        {error && <p role="alert" className="text-sm text-destructive">Unable to load saved plans. Configure plans in Monetization first.</p>}
        <div className="space-y-1"><Label htmlFor="policy-plan">Subscription plan</Label>
          <select id="policy-plan" className={selectClass} value={policy.planId} disabled={isLoading} onChange={(event) => {
            const plan = plans.find((p: any) => p.id === event.target.value);
            setPolicy({ ...policy, planId: event.target.value, maxEmployees: plan?.max_employees ?? "", maxUsers: plan?.max_users ?? "" });
          }}><option value="">Unassigned</option>{plans.map((plan: any) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><Label htmlFor="policy-status">Workspace status</Label><select id="policy-status" className={selectClass} value={policy.status} onChange={(e) => setPolicy({ ...policy, status: e.target.value })}><option value="active">Active</option><option value="suspended">Suspended</option></select></div>
          <div className="space-y-1"><Label htmlFor="policy-cycle">Billing cycle</Label><select id="policy-cycle" className={selectClass} value={policy.billingCycle} onChange={(e) => setPolicy({ ...policy, billingCycle: e.target.value })}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></div>
          <div className="space-y-1"><Label htmlFor="policy-employees">Employee limit</Label><Input id="policy-employees" type="number" min="0" step="1" placeholder="Unlimited" value={policy.maxEmployees} onChange={(e) => setPolicy({ ...policy, maxEmployees: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="policy-users">User limit</Label><Input id="policy-users" type="number" min="0" step="1" placeholder="Unlimited" value={policy.maxUsers} onChange={(e) => setPolicy({ ...policy, maxUsers: e.target.value })} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Blank limits mean unlimited; 0 blocks new records. Employee limits count all employee records. User limits exclude platform administrators.</p>
        <div className="space-y-1"><Label htmlFor="policy-expiry">Access expires at end of day (UTC)</Label><Input id="policy-expiry" type="date" value={policy.expiresAt} onChange={(e) => setPolicy({ ...policy, expiresAt: e.target.value })} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button><Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save controls"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
