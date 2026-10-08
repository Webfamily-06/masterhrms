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
import { ArrowRightLeft, Plus, MapPin, Building2, User, Calendar, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/transfers")({
  component: HrTransfersPage,
});

export default function HrTransfersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    toBranchId: "",
    toDeptId: "",
    newManagerId: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-transfers"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/transfers");
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

  const { data: branches = [] } = useQuery({
    queryKey: ["hr-branches-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches");
      return res.data?.data || res.data || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["hr-departments-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments");
      return res.data?.data || res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/lifecycle/transfers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-transfers"] });
      toast.success("Employee transfer successfully executed.");
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        toBranchId: "",
        toDeptId: "",
        newManagerId: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        reason: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to execute transfer.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Transfers & Relocations"
        description="Oversee branch transfers, inter-department movements, and reporting manager reassignments with regional policy realignment."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Execute Transfer
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Movements" value={String(transfers.length)} icon={ArrowRightLeft} description="Completed transitions" />
        <StatCard
          title="Branch Relocations"
          value={String(transfers.filter((t: any) => t.toBranchId).length)}
          icon={MapPin}
          description="Cross-office relocations"
        />
        <StatCard
          title="Dept Transfers"
          value={String(transfers.filter((t: any) => t.toDeptId).length)}
          icon={Building2}
          description="Internal department shifts"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transfer Details</TableHead>
                <TableHead>Reason / Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading transfers...
                  </TableCell>
                </TableRow>
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No employee transfers recorded.
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.employee?.firstName} {t.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{t.employee?.employeeCode}</span>
                    </TableCell>
                    <TableCell>{new Date(t.effectiveDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.toBranchId && <span className="block">Target Branch: {t.toBranchId}</span>}
                      {t.toDeptId && <span className="block">Target Dept: {t.toDeptId}</span>}
                      {t.newManagerId && <span className="block">New Manager: {t.newManagerId}</span>}
                      {!t.toBranchId && !t.toDeptId && !t.newManagerId && "Lateral realignment"}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-xs text-muted-foreground">
                      {t.reason || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Execute Transfer Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Execute Employee Transfer</DialogTitle>
            <DialogDescription>
              Relocate employee to another branch, department, or manager. Applies regional rules on effective date.
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
              <Label>Effective Date *</Label>
              <Input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Target Branch (Optional)</Label>
              <Select value={formData.toBranchId} onValueChange={(val) => setFormData({ ...formData, toBranchId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.city || "HQ"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Department (Optional)</Label>
              <Select value={formData.toDeptId} onValueChange={(val) => setFormData({ ...formData, toDeptId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>New Reporting Manager (Optional)</Label>
              <Select value={formData.newManagerId} onValueChange={(val) => setFormData({ ...formData, newManagerId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current manager" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.position || "Staff"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transfer Reason *</Label>
              <Textarea
                placeholder="Business requirement, relocation request, or organizational alignment..."
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
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.reason || createMutation.isPending}
            >
              {createMutation.isPending ? "Executing..." : "Execute Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
