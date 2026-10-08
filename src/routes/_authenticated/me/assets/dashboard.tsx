import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Laptop, AlertTriangle, Send, CheckCircle2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/assets/dashboard")({
  component: MeAssetsDashboardPage,
});

export default function MeAssetsDashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["me-assets-dashboard"],
    queryFn: async () => {
      const res = await api.get("/me/assets/dashboard");
      return res.data;
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Assets & Equipment"
        description="View your currently assigned company hardware, peripherals, and submit new requests."
      >
        <Link to="/me/assets/requests">
          <Button className="gap-2">
            <Send className="h-4 w-4" /> Request Equipment
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Assigned Devices"
          value={dashboard?.totalAssigned ?? 0}
          icon={<Laptop className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Acknowledgements"
          value={dashboard?.pendingAcknowledgement ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          className={dashboard?.pendingAcknowledgement > 0 ? "border-amber-400 bg-amber-50/20" : ""}
        />
        <StatCard
          title="Equipment Requests"
          value={dashboard?.requestsCount ?? 0}
          icon={<Send className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Laptop className="h-5 w-5 text-indigo-500" />
            Recently Assigned Equipment
          </CardTitle>
          <Link to="/me/assets">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Acknowledgement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Loading assets...
                  </TableCell>
                </TableRow>
              ) : !dashboard?.recentAssignments || dashboard.recentAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No hardware currently assigned to your account.
                  </TableCell>
                </TableRow>
              ) : (
                dashboard.recentAssignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.asset?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{a.asset?.assetTag}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(a.assignedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.conditionOnAssign}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.acknowledgedAt ? "default" : "secondary"}>
                        {a.acknowledgedAt ? "Acknowledged" : "Signature Pending"}
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
  );
}
