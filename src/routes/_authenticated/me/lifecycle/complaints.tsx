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
import { ShieldAlert, Plus, Calendar, Lock, CheckCircle2, AlertTriangle, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/lifecycle/complaints")({
  component: MeComplaintsPage,
});

export default function MeComplaintsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    againstEmployeeId: "",
    title: "",
    description: "",
    incidentDate: new Date().toISOString().split("T")[0],
    isAnonymous: false,
  });

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["me-lifecycle-complaints"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/complaints");
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=200");
      return res.data?.data || res.data || [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/me/lifecycle/complaints", {
        ...data,
        againstEmployeeId: data.againstEmployeeId || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Confidential grievance submitted to HR Leadership");
      queryClient.invalidateQueries({ queryKey: ["me-lifecycle-complaints"] });
      setIsModalOpen(false);
      setFormData({
        againstEmployeeId: "",
        title: "",
        description: "",
        incidentDate: new Date().toISOString().split("T")[0],
        isAnonymous: false,
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit report");
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Confidential Grievance & Whistleblower Channel"
        description="A secure, encrypted, and retaliation-protected reporting channel routed directly to HR Leadership."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Report Grievance
          </Button>
        }
      />

      <div className="p-4 bg-muted/40 rounded-lg border border-border flex items-start gap-3">
        <Lock className="h-5 w-5 text-indigo-500 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-foreground">Strict Whistleblower Protection Policy</p>
          <p className="text-muted-foreground">
            All reports submitted here are accessible exclusively to HR Leadership.
            Complaints are isolated and cannot be viewed by other employees or supervisors.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading reports...</div>
      ) : complaints.length === 0 ? (
        <Card className="py-12 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold">No Grievances Filed</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You have not submitted any workplace concern or complaint reports.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{c.title}</span>
                        {c.isAnonymous && (
                          <Badge variant="outline" className="text-xs">
                            <EyeOff className="h-3 w-3 mr-1" /> Anonymous
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Incident:{" "}
                          {c.incidentDate ? new Date(c.incidentDate).toLocaleDateString() : "—"}
                        </span>
                        <span>•</span>
                        <span>Case #{c.id.substring(0, 8)}</span>
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant={
                      c.status === "resolved"
                        ? "default"
                        : c.status === "investigating"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {c.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <p className="text-sm text-muted-foreground">{c.description}</p>

                  {c.resolutionNotes && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded border border-emerald-200/50 text-xs space-y-1">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        HR Resolution:
                      </span>
                      <p className="text-foreground">{c.resolutionNotes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* SUBMIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>File Confidential Grievance</DialogTitle>
            <DialogDescription>
              Submit details directly to HR Operations under full confidentiality.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Concern / Allegation Title</Label>
              <Input
                placeholder="Brief summary of concern..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <Label>Person Involved (Optional)</Label>
              <Select
                value={formData.againstEmployeeId}
                onValueChange={(val) => setFormData({ ...formData, againstEmployeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select individual (if applicable)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General / Workplace Issue</SelectItem>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.department?.name || "General"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date of Incident</Label>
              <Input
                type="date"
                value={formData.incidentDate}
                onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
              />
            </div>

            <div>
              <Label>Detailed Account</Label>
              <Textarea
                rows={4}
                placeholder="Describe what occurred, dates, locations, witnesses..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={submitMutation.isPending || !formData.title || !formData.description}
              onClick={() => submitMutation.mutate(formData)}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Grievance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
