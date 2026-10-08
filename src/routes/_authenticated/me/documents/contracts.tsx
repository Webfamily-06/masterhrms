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
import { FileSignature, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/documents/contracts")({
  component: MeContractsPage,
});

export default function MeContractsPage() {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["me-employee-contracts"],
    queryFn: async () => {
      const res = await api.get("/me/documents/contracts");
      return res.data;
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Employment Contracts"
        description="View your active employment agreement, terms, effective dates, and contract history."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-indigo-500" />
            My Contract Records ({contracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Effective Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading your contract records...
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No active employment contracts found in your file.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.contractType?.name || "Permanent"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(c.startDate).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.endDate ? new Date(c.endDate).toLocaleDateString() : "Permanent / Ongoing"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>
                        {c.status}
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
