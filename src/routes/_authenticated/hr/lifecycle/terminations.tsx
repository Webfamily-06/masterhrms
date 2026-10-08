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
import { UserX, Plus, ShieldAlert, AlertTriangle, DollarSign, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/terminations")({
  component: HrTerminationsPage,
});

export default function HrTerminationsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    exitType: "termination",
    severanceAmount: "0",
    reason: "",
    rehireEligible: false,
  });

  const { data: terminations = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-terminations"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/terminations");
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
      return await api.post("/hr/lifecycle/terminations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-terminations"] });
      toast.success("Termination executed and user access deactivated.");
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        exitType: "termination",
        severanceAmount: "0",
        reason: "",
        rehireEligible: false,
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to execute termination.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Involuntary Terminations & Severance"
        description="Execute authoritative employee terminations under strict compliance with severance calculations and immediate user credential revocation."
        actions={
          <Button onClick={() => setIsModalOpen(true)} variant="destructive" className="gap-2">
            <Plus className="h-4 w-4" /> Execute Termination
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Terminations Executed" value={String(terminations.length)} icon={UserX} description="Total offboarded via termination" />
        <StatCard
          title="Misconduct / Legal"
          value={String(terminations.filter((t: any) => t.exitType === "misconduct").length)}
          icon={ShieldAlert}
          description="Disciplinary terminations"
        />
        <StatCard
          title="Total Severance"
          value={`₹${terminations.reduce((sum: number, t: any) => sum + Number(t.fnfSettlementAmount || 0), 0).toLocaleString()}`}
          icon={DollarSign}
          description="Approved severance payouts"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Termination Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Termination Date</TableHead>
                <TableHead>Category / Grounds</TableHead>
                <TableHead>Severance</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading termination records...
                  </TableCell>
                </TableRow>
              ) : terminations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No involuntary terminations on record.
                  </TableCell>
                </TableRow>
              ) : (
                terminations.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.employee?.firstName} {t.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{t.employee?.employeeCode}</span>
                    </TableCell>
                    <TableCell>{new Date(t.lastWorkingDay).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="capitalize">
                        {t.exitType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {Number(t.fnfSettlementAmount) > 0 ? `₹${Number(t.fnfSettlementAmount).toLocaleString()}` : "None"}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-xs text-muted-foreground">
                      {t.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Execute Termination Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Execute Involuntary Termination
            </DialogTitle>
            <DialogDescription>
              Immediately transitions employee status to terminated, revokes application login access, and records legal severance grounds.
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
              <Label>Grounds / Category *</Label>
              <Select value={formData.exitType} onValueChange={(val) => setFormData({ ...formData, exitType: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="termination">General Termination</SelectItem>
                  <SelectItem value="performance">Unsatisfactory Performance</SelectItem>
                  <SelectItem value="misconduct">Gross Misconduct / Policy Violation</SelectItem>
                  <SelectItem value="redundancy">Organizational Redundancy</SelectItem>
                  <SelectItem value="absconding">Absconding / Abandonment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severance / Gratuity Provision (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.severanceAmount}
                onChange={(e) => setFormData({ ...formData, severanceAmount: e.target.value })}
              />
            </div>
            <div>
              <Label>Formal Grounds & Legal Documentation *</Label>
              <Textarea
                placeholder="Document detailed legal justification, notice period terms, and management decision..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                createMutation.mutate({
                  ...formData,
                  severanceAmount: parseFloat(formData.severanceAmount) || 0,
                })
              }
              disabled={!formData.employeeId || !formData.reason || createMutation.isPending}
            >
              {createMutation.isPending ? "Executing..." : "Confirm Termination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
