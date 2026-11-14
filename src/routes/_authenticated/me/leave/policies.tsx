import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { formatLeaveDays } from "@/lib/leave-helpers";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Bell,
  CalendarCheck,
  Layers,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/leave/policies")({
  component: MeLeavePoliciesPage,
});

export default function MeLeavePoliciesPage() {
  const {
    data: policyPayload,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["me-leave-policy"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/policies");
      return unwrapData<any>(res);
    },
  });

  const policies: any[] = Array.isArray(policyPayload?.policies)
    ? policyPayload.policies
    : [];
  const leaveTypePolicies: any[] = Array.isArray(policyPayload?.leaveTypePolicies)
    ? policyPayload.leaveTypePolicies
    : [];
  const defaultPolicy = policyPayload?.defaultPolicy || policies[0] || null;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="My Leave Policies & Entitlements"
        description="Live HR leave policies, advance notice rules, carry-forward caps, and eligibility criteria."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading organizational leave policies...
        </div>
      ) : policies.length === 0 && leaveTypePolicies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No active leave policies have been published by HR yet.
          </CardContent>
        </Card>
      ) : (
        <>
          {defaultPolicy && (
            <Card className="border-border/80" data-testid="ess-default-policy-card">
              <CardHeader className="border-b pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold">
                      {defaultPolicy.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {defaultPolicy.leaveType?.name
                        ? `Linked Category: ${defaultPolicy.leaveType.name}`
                        : "Organization-wide Default Leave Governance"}
                      {defaultPolicy.effectiveFrom
                        ? ` • Effective from ${String(defaultPolicy.effectiveFrom).slice(0, 10)}`
                        : ""}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Active Policy
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-amber-500" />
                      Advance Notice Period
                    </span>
                    <p className="text-xl font-bold">
                      {Number(defaultPolicy.noticeDays ?? 0)} Days
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Minimum advance notice required for planned leave requests.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CalendarCheck className="w-4 h-4 text-purple-500" />
                      Duration Limits
                    </span>
                    <p className="text-xl font-bold">
                      {defaultPolicy.minDays
                        ? `${formatLeaveDays(defaultPolicy.minDays)} – `
                        : "Up to "}
                      {defaultPolicy.maxConsecutiveDays ?? "Unlimited"}{" "}
                      {defaultPolicy.maxConsecutiveDays ? "Days" : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Allowed minimum and maximum consecutive leave days per request.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      Sandwich & Half-Day
                    </span>
                    <p className="text-base font-bold">
                      Sandwich: {defaultPolicy.sandwichRule ? "Enabled" : "Disabled"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Half-Day Requests:{" "}
                      {defaultPolicy.halfDayAllowed === false ? "Not Allowed" : "Allowed"}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      Accrual & Carry Forward
                    </span>
                    <p className="text-base font-bold capitalize">
                      {defaultPolicy.accrualFrequency || "Yearly"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Max Carry Forward: {formatLeaveDays(defaultPolicy.carryForward ?? 0)} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {leaveTypePolicies.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold">
                  Leave Category Entitlements & Rules
                </CardTitle>
                <CardDescription className="text-xs">
                  Resolved policy rules currently active for your employee profile across all active leave categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                      <tr>
                        <th className="py-3 px-4 text-left">Leave Type</th>
                        <th className="py-3 px-4 text-left">Annual Quota</th>
                        <th className="py-3 px-4 text-left">Carry Forward</th>
                        <th className="py-3 px-4 text-left">Min / Max Days</th>
                        <th className="py-3 px-4 text-left">Notice</th>
                        <th className="py-3 px-4 text-left">Rules</th>
                        <th className="py-3 px-4 text-left">Eligibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {leaveTypePolicies.map((lt: any) => {
                        const pol = lt.policy || {};
                        return (
                          <tr key={lt.id} className="hover:bg-muted/30">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: lt.color || "#3B82F6" }}
                                />
                                <span className="font-semibold">{lt.name}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {lt.isPaid === false ? "Unpaid" : "Paid"}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs font-semibold">
                              {lt.isPaid === false && Number(lt.daysPerYear) === 0
                                ? "Unpaid (As Needed)"
                                : `${formatLeaveDays(lt.daysPerYear)} days`}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">
                              {lt.carryForward
                                ? `Up to ${formatLeaveDays(pol.carryForward ?? lt.maxCarryForward ?? 0)}d`
                                : "No"}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">
                              {pol.minDays ? `${formatLeaveDays(pol.minDays)}d` : "0.5d"} /{" "}
                              {pol.maxConsecutiveDays ? `${pol.maxConsecutiveDays}d` : "No cap"}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">
                              {Number(pol.noticeDays ?? 0)}d
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px]">
                                  {pol.halfDayAllowed === false ? "Full-Day Only" : "Half-Day OK"}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  Sandwich: {pol.sandwichRule ? "On" : "Off"}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  {pol.requiresApproval === false ? "Auto-Approve" : "Approval Req."}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {lt.eligible === false ? (
                                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {lt.ineligibleReason || "Probation Restricted"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Eligible
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-border">
                  {leaveTypePolicies.map((lt: any) => {
                    const pol = lt.policy || {};
                    return (
                      <div key={lt.id} className="p-4 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: lt.color || "#3B82F6" }}
                            />
                            <span className="font-semibold text-sm truncate">{lt.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {lt.isPaid === false ? "Unpaid" : "Paid"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <div>
                            Quota:{" "}
                            <strong className="text-foreground">
                              {lt.isPaid === false && Number(lt.daysPerYear) === 0
                                ? "Unpaid"
                                : `${formatLeaveDays(lt.daysPerYear)}d`}
                            </strong>
                          </div>
                          <div>
                            Notice:{" "}
                            <strong className="text-foreground">
                              {Number(pol.noticeDays ?? 0)}d
                            </strong>
                          </div>
                          <div>
                            Min / Max:{" "}
                            <strong className="text-foreground">
                              {pol.minDays ? `${formatLeaveDays(pol.minDays)}d` : "0.5d"} /{" "}
                              {pol.maxConsecutiveDays ? `${pol.maxConsecutiveDays}d` : "∞"}
                            </strong>
                          </div>
                          <div>
                            Carry Forward:{" "}
                            <strong className="text-foreground">
                              {lt.carryForward
                                ? `${formatLeaveDays(pol.carryForward ?? lt.maxCarryForward ?? 0)}d`
                                : "No"}
                            </strong>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {pol.halfDayAllowed === false ? "Full-Day Only" : "Half-Day OK"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            Sandwich: {pol.sandwichRule ? "On" : "Off"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {lt.eligible === false ? "Probation Restricted" : "Eligible"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {policies.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold">
                  Configured Active Policies ({policies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {policies.map((p: any) => (
                  <div
                    key={p.id}
                    data-testid={`ess-policy-item-${p.id}`}
                    className="p-3.5 rounded-lg border bg-muted/10 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{p.name}</span>
                      <div className="flex items-center gap-1">
                        {p.isDefault && (
                          <Badge variant="outline" className="text-[10px]">
                            Default
                          </Badge>
                        )}
                        {p.leaveType?.name && (
                          <Badge variant="secondary" className="text-[10px]">
                            {p.leaveType.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
                      <div>Notice: <strong className="text-foreground">{Number(p.noticeDays ?? 0)}d</strong></div>
                      <div>Max Consecutive: <strong className="text-foreground">{p.maxConsecutiveDays ?? "No cap"}</strong></div>
                      <div>Min Days: <strong className="text-foreground">{p.minDays ? formatLeaveDays(p.minDays) : "0.5"}</strong></div>
                      <div>Carry Forward: <strong className="text-foreground">{formatLeaveDays(p.carryForward ?? 0)}d</strong></div>
                      <div>Accrual: <strong className="text-foreground capitalize">{p.accrualFrequency || "yearly"}</strong></div>
                      <div>Probation Allowed: <strong className="text-foreground">{p.probationAllowed ? "Yes" : "No"}</strong></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
