import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, CalendarCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/attendance/policies")({
  component: MeAttendancePoliciesPage,
});

export default function MeAttendancePoliciesPage() {
  const { data: policy, isLoading } = useQuery({
    queryKey: ["me-attendance-policy"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/attendance/policies");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance Policy"
        description="The active organizational attendance and working hour policies applicable to your employment."
      />

      <div className="max-w-2xl">
        <Card className="border-border/80">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">{policy?.name || "Corporate Attendance Policy"}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Applicable across your designated department & branch
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                Active v{policy?.version || 1}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Grace Arrival Window
                </span>
                <p className="text-xl font-bold">{policy?.graceMinutes || 15} Minutes</p>
                <p className="text-[11px] text-muted-foreground">
                  Check-ins within this buffer do not incur a late mark penalty.
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-purple-500" />
                  Full-Day Minimum
                </span>
                <p className="text-xl font-bold">{policy?.fullDayHours || 8} Hours</p>
                <p className="text-[11px] text-muted-foreground">
                  Minimum effective working duration for full attendance credit.
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  Half-Day Minimum
                </span>
                <p className="text-xl font-bold">{policy?.halfDayHours || 4} Hours</p>
                <p className="text-[11px] text-muted-foreground">
                  Punches below this threshold default to half-day or absent.
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-muted/20 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-500" />
                  Standard Working Days
                </span>
                <p className="text-sm font-semibold mt-1">{policy?.workingDays || "Mon, Tue, Wed, Thu, Fri"}</p>
                <p className="text-[11px] text-muted-foreground">
                  Official operational days scheduled per business calendar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
