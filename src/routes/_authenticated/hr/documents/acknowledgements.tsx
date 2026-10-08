import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileCheck2, Plus, ShieldCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/documents/acknowledgements")({
  component: HrDocumentAcknowledgementsPage,
});

export default function HrDocumentAcknowledgementsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");

  const { data: acks = [], isLoading } = useQuery({
    queryKey: ["hr-document-acknowledgements"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/acknowledgements");
      return res.data;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["hr-company-documents-picker"],
    queryFn: async () => {
      const res = await api.get("/hr/documents");
      return res.data;
    },
  });

  const launchCampaignMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/documents/acknowledgements/campaign", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Sign-off campaign launched to ${data.totalTargeted} employees`);
      queryClient.invalidateQueries({ queryKey: ["hr-document-acknowledgements"] });
      setIsModalOpen(false);
      setSelectedDocId("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to launch campaign");
    },
  });

  const signedCount = acks.filter((a: any) => a.status === "acknowledged").length;
  const pendingCount = acks.filter((a: any) => a.status === "pending").length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Policy Sign-Off Campaigns"
        description="Controlled acknowledgment workflows for mandatory employee policies and compliance guidelines."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Launch Sign-Off Campaign
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Signed Acknowledgements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{signedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Digital signature & IP recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Pending Signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting employee portal confirmation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-indigo-500" />
            Audit Log of Policy Acknowledgements ({acks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy Document</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acknowledged Date</TableHead>
                <TableHead>Recorded IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading acknowledgements...
                  </TableCell>
                </TableRow>
              ) : acks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No sign-off campaigns active. Click "Launch Sign-Off Campaign" to start one.
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
                      <div>{a.employee?.firstName} {a.employee?.lastName}</div>
                      <div className="text-xs text-muted-foreground">{a.employee?.employeeCode}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === "acknowledged" ? "default" : "secondary"}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.ipAddress || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Launch Sign-Off Campaign</DialogTitle>
            <DialogDescription>
              Assign a mandatory policy acknowledgment campaign to all active employees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Policy Document</Label>
              <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose document from vault" />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title} ({d.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted/40 rounded text-xs text-muted-foreground">
              This campaign will require digital confirmation from all active staff upon their next login to the Employee Portal.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                launchCampaignMutation.mutate({
                  documentId: selectedDocId,
                  allEmployees: true,
                })
              }
              disabled={!selectedDocId || launchCampaignMutation.isPending}
            >
              {launchCampaignMutation.isPending ? "Deploying..." : "Deploy Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
