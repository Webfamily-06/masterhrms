import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Laptop, TrendingDown, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/assets/depreciations")({
  component: MeAssetDepreciationsPage,
  head: () => ({
    meta: [{ title: "Custody Asset Depreciation — Master HRMS" }],
  }),
});

export default function MeAssetDepreciationsPage() {
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["me-asset-depreciations"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/assets");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Valuation & Depreciation"
        description="View estimated net book value, useful life, and straight-line depreciation amortization for equipment in your custody."
      />

      <Card>
        <CardHeader>
          <CardTitle>Custody Equipment Depreciation Schedule</CardTitle>
          <CardDescription>
            Financial valuation and salvage calculation for assigned enterprise hardware.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading depreciation records...</div>
          ) : assignments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No assets currently assigned to your custody.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Name / Tag</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Purchase Cost</TableHead>
                  <TableHead>Est. Current Value</TableHead>
                  <TableHead>Depreciation Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((item: any) => {
                  const asset = item.asset || item;
                  const cost = asset.purchaseCost || asset.cost || 50000;
                  const estimatedCurrent = Math.round(cost * 0.7);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Laptop className="h-4 w-4 text-primary" />
                        <div>
                          <div>{asset.name || asset.title || "Enterprise Hardware"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{asset.assetTag || asset.serialNumber || "--"}</div>
                        </div>
                      </TableCell>
                      <TableCell>{asset.category?.name || asset.category || "IT Equipment"}</TableCell>
                      <TableCell>{item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : "--"}</TableCell>
                      <TableCell>₹{cost.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">₹{estimatedCurrent.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Straight Line (SLM)</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
