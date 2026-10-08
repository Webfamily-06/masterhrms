import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { FileQuestion, Plus, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/documents/requests")({
  component: MeDocumentRequestsPage,
});

export default function MeDocumentRequestsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    letterType: "EXPERIENCE",
    purpose: "",
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["me-document-requests-list"],
    queryFn: async () => {
      const res = await api.get("/me/documents/requests");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/me/documents/requests", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Document request submitted to HR");
      queryClient.invalidateQueries({ queryKey: ["me-document-requests-list"] });
      setIsModalOpen(false);
      setFormData({ letterType: "EXPERIENCE", purpose: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit request");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Document & Letter Requests"
        description="Request official experience certificates, bonafide letters, or embassy visa NOCs."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Request Letter
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-indigo-500" />
            Submitted Requests ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Letter Type</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>HR Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading your document requests...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    You have not submitted any document requests. Click "Request Letter" to submit one.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{r.letterType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.purpose}</TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "ISSUED"
                            ? "default"
                            : r.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.rejectionNotes || "—"}
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
            <DialogTitle>Request Official HR Document</DialogTitle>
            <DialogDescription>
              Submit a formal request for an official letter with corporate stamp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Letter Type</Label>
              <Select
                value={formData.letterType}
                onValueChange={(val) => setFormData({ ...formData, letterType: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPERIENCE">Experience Certificate</SelectItem>
                  <SelectItem value="BONAFIDE">Bonafide Certificate</SelectItem>
                  <SelectItem value="NOC">No Objection Certificate (NOC / Visa)</SelectItem>
                  <SelectItem value="SALARY">Salary Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Purpose / Bank / Authority Details</Label>
              <Textarea
                placeholder="State the requirement (e.g. Schengen Visa application, Bank Home Loan)..."
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.purpose || createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
