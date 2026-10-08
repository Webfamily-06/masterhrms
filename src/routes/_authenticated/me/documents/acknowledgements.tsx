import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
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
import { toast } from "sonner";
import { FileCheck, CheckCircle2, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/documents/acknowledgements")({
  component: MeAcknowledgementsPage,
});

export default function MeAcknowledgementsPage() {
  const queryClient = useQueryClient();

  const { data: acks = [], isLoading } = useQuery({
    queryKey: ["me-document-acknowledgements"],
    queryFn: async () => {
      const res = await api.get("/me/documents/acknowledgements");
      return res.data;
    },
  });

  const signMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await api.post(`/me/documents/acknowledgements/${documentId}`, {
        comments: "Acknowledged via Employee Self-Service Portal",
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Policy acknowledged and digitally signed");
      queryClient.invalidateQueries({ queryKey: ["me-document-acknowledgements"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit acknowledgement");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Policy Sign-Offs & Acknowledgements"
        description="Mandatory corporate compliance policies, employee handbooks, and health safety protocols."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-indigo-500" />
            Mandatory Documents Requiring Sign-Off ({acks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sign-off Status</TableHead>
                <TableHead>Acknowledged Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading policies...
                  </TableCell>
                </TableRow>
              ) : acks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    You have no pending policy sign-off campaigns. All acknowledgements up to date.
                  </TableCell>
                </TableRow>
              ) : (
                acks.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <div>{a.document?.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{a.document?.documentCode}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.document?.category || "Policy"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === "acknowledged" ? "default" : "destructive"}>
                        {a.status === "acknowledged" ? "Signed & Valid" : "Action Required"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleString() : "Pending"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {a.document?.fileUrl && (
                        <a href={a.document.fileUrl} target="_blank" rel="noreferrer" download>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Download className="h-3.5 w-3.5" /> Read
                          </Button>
                        </a>
                      )}
                      {a.status !== "acknowledged" ? (
                        <Button
                          size="sm"
                          onClick={() => signMutation.mutate(a.documentId)}
                          disabled={signMutation.isPending}
                          className="gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledge & Sign
                        </Button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">✓ Acknowledged</span>
                      )}
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
