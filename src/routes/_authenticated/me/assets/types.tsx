import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Boxes, Laptop, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/assets/types")({
  component: MeAssetTypesPage,
  head: () => ({
    meta: [{ title: "Asset Categories & Guidelines — Master HRMS" }],
  }),
});

export default function MeAssetTypesPage() {
  const { data: assetTypes = [], isLoading } = useQuery({
    queryKey: ["me-asset-types"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/assets/types");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Categories & Equipment Types"
        description="Browse company equipment categories, default replacement cycles, and device provisioning standards."
      />

      <Card>
        <CardHeader>
          <CardTitle>Hardware & Software Asset Catalog</CardTitle>
          <CardDescription>
            Official categories, warranty terms, and expected life cycles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading asset categories...</div>
          ) : assetTypes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No asset categories defined.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Useful Life</TableHead>
                  <TableHead>Depreciation Rate</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetTypes.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-primary" />
                      {t.name || t.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.classification || "IT Hardware"}</Badge>
                    </TableCell>
                    <TableCell>{t.usefulLifeYears ? `${t.usefulLifeYears} Years` : "3 Years"}</TableCell>
                    <TableCell>{t.depreciationRate ? `${t.depreciationRate}% / yr` : "33% / yr"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {t.description || "Standard enterprise provisioned equipment."}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
