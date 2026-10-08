import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
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
import { ShieldAlert, CheckCircle2, Clock, Eye, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/complaints")({
  component: HrComplaintsPage,
});

export default function HrComplaintsPage() {
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [resolutionData, setResolutionData] = useState({
    resolutionNotes: "",
    actionTaken: "counselling",
  });

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-complaints"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/complaints");
      return res.data;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/hr/lifecycle/complaints/${id}/resolve`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-complaints"] });
      toast.success("Complaint case resolved.");
      setSelectedComplaint(null);
      setResolutionData({ resolutionNotes: "", actionTaken: "counselling" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to resolve complaint.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grievances & Confidential Cases"
        description="Handle employee grievances, ethics reports, and workplace investigations with whistleblower confidentiality."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Grievances" value={String(complaints.length)} icon={ShieldAlert} description="Reported cases" />
        <StatCard
          title="Open Investigations"
          value={String(complaints.filter((c: any) => ["new", "under_review", "investigating"].includes(c.status)).length)}
          icon={Clock}
          description="In-progress inquiries"
        />
        <StatCard
          title="Resolved"
          value={String(complaints.filter((c: any) => c.status === "resolved").length)}
          icon={CheckCircle2}
          description="Concluded cases"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case Registry</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Ticket</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Complainant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading cases...
                  </TableCell>
                </TableRow>
              ) : complaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No active grievances on record.
                  </TableCell>
                </TableRow>
              ) : (
                complaints.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-semibold">{c.ticketCode}</TableCell>
                    <TableCell>{c.category}</TableCell>
                    <TableCell>
                      <Badge variant={c.severity === "critical" ? "destructive" : "secondary"} className="capitalize">
                        {c.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.subject}</TableCell>
                    <TableCell>
                      {c.isAnonymous ? (
                        <Badge variant="outline" className="text-xs">
                          Anonymous
                        </Badge>
                      ) : (
                        "Confidential Employee"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {c.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedComplaint(c);
                            setResolutionData({
                              resolutionNotes: c.resolutionNotes || "",
                              actionTaken: c.actionTaken || "counselling",
                            });
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conclude & Resolve Grievance</DialogTitle>
            <DialogDescription>
              Record findings and formal corrective action taken to close this case.
            </DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                <p>
                  <strong>Case:</strong> {selectedComplaint.ticketCode} ({selectedComplaint.category})
                </p>
                <p>
                  <strong>Description:</strong> {selectedComplaint.description}
                </p>
              </div>

              <div>
                <Label>Action Taken *</Label>
                <Select
                  value={resolutionData.actionTaken}
                  onValueChange={(val) => setResolutionData({ ...resolutionData, actionTaken: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="counselling">Counselling & Mediation</SelectItem>
                    <SelectItem value="warning_issued">Disciplinary Warning Issued</SelectItem>
                    <SelectItem value="transfer">Inter-Department Transfer</SelectItem>
                    <SelectItem value="termination">Employment Termination</SelectItem>
                    <SelectItem value="no_fault">Dismissed / No Fault Found</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Resolution Findings & Notes *</Label>
                <Textarea
                  placeholder="Summarize investigation conclusions and final remedial measures..."
                  value={resolutionData.resolutionNotes}
                  onChange={(e) => setResolutionData({ ...resolutionData, resolutionNotes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                resolveMutation.mutate({
                  id: selectedComplaint.id,
                  payload: resolutionData,
                })
              }
              disabled={!resolutionData.resolutionNotes || resolveMutation.isPending}
            >
              {resolveMutation.isPending ? "Resolving..." : "Confirm & Resolve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
