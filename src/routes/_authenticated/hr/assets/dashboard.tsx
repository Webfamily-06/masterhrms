import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Laptop, CheckCircle2, Clock, Wrench, IndianRupee, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/assets/dashboard")({
  component: HrAssetsDashboardPage,
});

export default function HrAssetsDashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["hr-assets-overview"],
    queryFn: async () => {
      const res = await api.get("/hr/assets/overview");
      return res.data;
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Asset Management Command Center"
        description="Enterprise hardware, peripherals, and software license lifecycle & depreciation tracking."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Hardware Assets"
          value={overview?.totalAssets ?? 0}
          icon={Laptop}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Available in Stock"
          value={overview?.availableAssets ?? 0}
          icon={CheckCircle2}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="Active Assignments"
          value={overview?.assignedAssets ?? 0}
          icon={Layers}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Under Maintenance"
          value={overview?.maintenanceAssets ?? 0}
          icon={Wrench}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-500" />
              Capital Asset Valuation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/40 rounded-lg space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Total Purchase Cost</span>
              <div className="text-2xl font-bold text-foreground">
                ₹{Number(overview?.totalAssetValue ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-muted/40 rounded-lg space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Pending Requests</span>
              <div className="text-2xl font-bold text-amber-600">
                {overview?.pendingRequests ?? 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Recent Asset Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Acknowledged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Loading recent assignments...
                    </TableCell>
                  </TableRow>
                ) : !overview?.recentAssignments || overview.recentAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No recent asset assignments logged.
                    </TableCell>
                  </TableRow>
                ) : (
                  overview.recentAssignments.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        <div>{a.asset?.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{a.asset?.assetTag}</div>
                      </TableCell>
                      <TableCell>
                        {a.employee?.firstName} {a.employee?.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.conditionOnAssign}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.acknowledgedAt ? "default" : "secondary"}>
                          {a.acknowledgedAt ? "Signed" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
