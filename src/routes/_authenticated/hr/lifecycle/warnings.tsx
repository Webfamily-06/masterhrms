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
import { AlertTriangle, Plus, Trash2, ShieldAlert, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/warnings")({
  component: HrWarningsPage,
});

export default function HrWarningsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    subject: "",
    severity: "moderate",
    warningDate: new Date().toISOString().split("T")[0],
    description: "",
    warningBy: "",
  });

  const { data: warnings = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-warnings"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/warnings");
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

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/lifecycle/warnings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-warnings"] });
      toast.success("Disciplinary warning issued and logged to employee timeline.");
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        subject: "",
        severity: "moderate",
        warningDate: new Date().toISOString().split("T")[0],
        description: "",
        warningBy: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to issue warning.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/lifecycle/warnings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-warnings"] });
      toast.success("Warning record retracted.");
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return <Badge className="bg-red-500 hover:bg-red-600">Critical</Badge>;
      case "major":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Major</Badge>;
      case "moderate":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Moderate</Badge>;
      default:
        return <Badge variant="secondary">Minor</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disciplinary Warnings & Compliance"
        description="Issue formal reprimands, track employee digital acknowledgements, and manage written appeals."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-destructive hover:bg-destructive/90 text-white">
            <Plus className="h-4 w-4" /> Issue Warning
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Warnings" value={String(warnings.length)} icon={AlertTriangle} description="Logged infractions" />
        <StatCard
          title="Critical / Major"
          value={String(warnings.filter((w: any) => ["critical", "major"].includes(w.severity?.toLowerCase())).length)}
          icon={ShieldAlert}
          description="High severity compliance cases"
        />
        <StatCard
          title="Acknowledged"
          value={String(warnings.filter((w: any) => w.status === "acknowledged").length)}
          icon={CheckCircle2}
          description="Signed off by employees"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disciplinary Registry</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Incident Date</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Employee Response</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading warnings...
                  </TableCell>
                </TableRow>
              ) : warnings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No active disciplinary warnings on record.
                  </TableCell>
                </TableRow>
              ) : (
                warnings.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">
                      {w.employee?.firstName} {w.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{w.employee?.employeeCode}</span>
                    </TableCell>
                    <TableCell>{new Date(w.warningDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getSeverityBadge(w.severity)}</TableCell>
                    <TableCell className="font-medium">{w.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {w.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {w.employeeResponse || "Awaiting response"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(w.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Issue Warning Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Disciplinary Warning</DialogTitle>
            <DialogDescription>
              Logs a formal reprimand to the employee's file. The employee is required to acknowledge receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Employee *</Label>
              <Select value={formData.employeeId} onValueChange={(val) => setFormData({ ...formData, employeeId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity Tier *</Label>
              <Select value={formData.severity} onValueChange={(val) => setFormData({ ...formData, severity: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor (Notice)</SelectItem>
                  <SelectItem value="moderate">Moderate (Formal Warning)</SelectItem>
                  <SelectItem value="major">Major (Written Reprimand)</SelectItem>
                  <SelectItem value="critical">Critical (Final Notice)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Incident Date *</Label>
              <Input
                type="date"
                value={formData.warningDate}
                onChange={(e) => setFormData({ ...formData, warningDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Subject / Violation *</Label>
              <Input
                placeholder="e.g. Unexcused absence / Breach of policy"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            <div>
              <Label>Issued By (Title/Authority)</Label>
              <Input
                placeholder="e.g. Department Head / HR Director"
                value={formData.warningBy}
                onChange={(e) => setFormData({ ...formData, warningBy: e.target.value })}
              />
            </div>
            <div>
              <Label>Incident Description & Findings *</Label>
              <Textarea
                placeholder="Factual findings, witnesses, and corrective action required..."
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
              variant="destructive"
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.subject || !formData.description || createMutation.isPending}
            >
              {createMutation.isPending ? "Issuing..." : "Confirm & Issue Warning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
