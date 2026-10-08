import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
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
import { TrendingDown, IndianRupee, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/assets/depreciation")({
  component: HrAssetsDepreciationPage,
});

export default function HrAssetsDepreciationPage() {
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["hr-assets-depreciation"],
    queryFn: async () => {
      const res = await api.get("/hr/assets/depreciation");
      return res.data;
    },
  });

  const totalDepreciation = schedules.reduce(
    (acc: number, curr: any) => acc + Number(curr.accumulatedDepreciation || 0),
    0
  );
  const totalBookValue = schedules.reduce(
    (acc: number, curr: any) => acc + Number(curr.bookValue || 0),
    0
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Asset Depreciation Engine"
        description="Straight-Line Depreciation schedule tracking useful life, salvage thresholds, and current book value."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-500" /> Total Accumulated Depreciation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              ₹{totalDepreciation.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Calculated via Straight-Line Method (SLM)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-emerald-500" /> Current Net Book Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ₹{totalBookValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Net asset valuation on company balance sheet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" /> Accounting Standard Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-foreground">AS-10 / Ind AS 16 Standard</div>
            <p className="text-xs text-muted-foreground mt-1">Server-authoritative Monthly amortizations</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Depreciation Schedules ({schedules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fiscal Period</TableHead>
                <TableHead>Depreciation Method</TableHead>
                <TableHead>Amortized Amount</TableHead>
                <TableHead>Accumulated Depreciation</TableHead>
                <TableHead>Closing Book Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Calculating depreciation schedules...
                  </TableCell>
                </TableRow>
              ) : schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No depreciation schedules posted yet. Schedules are automatically posted monthly.
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium font-mono">
                      {s.periodYear}-{String(s.periodMonth).padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.method || "STRAIGHT_LINE"}</Badge>
                    </TableCell>
                    <TableCell>₹{Number(s.depreciationAmount || 0).toLocaleString()}</TableCell>
                    <TableCell>₹{Number(s.accumulatedDepreciation || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      ₹{Number(s.bookValue || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Posted</Badge>
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
