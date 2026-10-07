import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Bell, CalendarCheck, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/leave/policies")({
  component: MeLeavePoliciesPage,
});

export default function MeLeavePoliciesPage() {
  const { data: policy, isLoading } = useQuery({
    queryKey: ["me-leave-policy"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/policies");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Leave Policy"
        description="The active organizational rules governing leave advance notice, consecutive durations, and accruals."
      />

      <div className="max-w-2xl">
        <Card className="border-border/80">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">{policy?.name || "Corporate Leave Policy"}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Enforced across all department leave requests
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                Active Policy
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-500" />
                  Advance Notice Period
                </span>
                <p className="text-xl font-bold">{policy?.noticeDays || 2} Days</p>
                <p className="text-[11px] text-muted-foreground">
                  Planned absences must be submitted at least this many days in advance.
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-purple-500" />
                  Max Consecutive Duration
                </span>
                <p className="text-xl font-bold">{policy?.maxConsecutiveDays || 14} Days</p>
                <p className="text-[11px] text-muted-foreground">
                  Single leave requests exceeding this cap require special executive approval.
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  Sandwich Rule Enforcement
                </span>
                <p className="text-xl font-bold">{policy?.sandwichRule ? "Enabled" : "Disabled"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {policy?.sandwichRule
                    ? "Holidays or weekends falling between leave days count as leave."
                    : "Weekends and company holidays do not consume your quota."}
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Accrual Frequency
                </span>
                <p className="text-sm font-semibold mt-1">{policy?.accrualFrequency || "Monthly"}</p>
                <p className="text-[11px] text-muted-foreground">
                  Quota credits are accrued into your ledger on this schedule.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
