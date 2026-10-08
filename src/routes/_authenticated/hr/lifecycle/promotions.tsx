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
import { TrendingUp, Plus, Briefcase, Calendar, DollarSign, Award, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/promotions")({
  component: HrPromotionsPage,
});

export default function HrPromotionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    newDesignation: "",
    newDepartment: "",
    newSalary: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    promotionType: "merit",
    remarks: "",
  });

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-promotions"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/promotions");
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
      return await api.post("/hr/lifecycle/promotions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-promotions"] });
      toast.success("Promotion successfully recorded and employee profile updated.");
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        newDesignation: "",
        newDepartment: "",
        newSalary: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        promotionType: "merit",
        remarks: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to execute promotion.");
    },
  });

  const selectedEmployee = employees.find((e: any) => e.id === formData.employeeId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions & Career Progressions"
        description="Authorize merit-based promotions, role elevations, and compensation revisions with immutable audit logging."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Record Promotion
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Promotions" value={String(promotions.length)} icon={TrendingUp} description="Recorded career leaps" />
        <StatCard
          title="Merit-Based Elevate"
          value={String(promotions.filter((p: any) => p.promotionType === "merit").length)}
          icon={Award}
          description="Performance-driven"
        />
        <StatCard
          title="Average Increment"
          value={
            promotions.length > 0
              ? `₹${Math.round(
                  promotions.reduce((sum: number, p: any) => sum + (Number(p.newSalary || 0) - Number(p.previousSalary || 0)), 0) /
                    promotions.length
                ).toLocaleString()}`
              : "₹0"
          }
          icon={DollarSign}
          description="Average salary revision"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Promotion History & Effective Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Designation Movement</TableHead>
                <TableHead>Compensation Adjustment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Justification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading promotion records...
                  </TableCell>
                </TableRow>
              ) : promotions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No promotions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                promotions.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.employee?.firstName} {p.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{p.employee?.employeeCode}</span>
                    </TableCell>
                    <TableCell>{new Date(p.promotionDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">{p.previousDesignation || "—"}</span>
                        <ArrowRight className="h-3 w-3 text-primary" />
                        <span className="font-semibold text-foreground">{p.newDesignation}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.newSalary ? (
                        <span>
                          {p.previousSalary ? `₹${Number(p.previousSalary).toLocaleString()} → ` : ""}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            ₹{Number(p.newSalary).toLocaleString()}
                          </strong>
                        </span>
                      ) : (
                        "No salary revision"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {p.promotionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {p.remarks || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Promotion Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Promotion</DialogTitle>
            <DialogDescription>
              Atomically upgrades the employee's title, compensation, and publishes an append-only timeline event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Employee *</Label>
              <Select value={formData.employeeId} onValueChange={(val) => setFormData({ ...formData, employeeId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.position || "Staff"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEmployee && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {selectedEmployee.position || "N/A"} | Current Salary: ₹{selectedEmployee.salary ? Number(selectedEmployee.salary).toLocaleString() : "0"}
                </p>
              )}
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
              <Label>New Designation / Role *</Label>
              <Input
                placeholder="e.g. Senior Software Architect"
                value={formData.newDesignation}
                onChange={(e) => setFormData({ ...formData, newDesignation: e.target.value })}
              />
            </div>
            <div>
              <Label>Revised Salary (₹ / Annual or Monthly CTC)</Label>
              <Input
                type="number"
                placeholder="e.g. 1200000"
                value={formData.newSalary}
                onChange={(e) => setFormData({ ...formData, newSalary: e.target.value })}
              />
            </div>
            <div>
              <Label>Promotion Type</Label>
              <Select
                value={formData.promotionType}
                onValueChange={(val) => setFormData({ ...formData, promotionType: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merit">Merit & Performance</SelectItem>
                  <SelectItem value="annual_appraisal">Annual Appraisal</SelectItem>
                  <SelectItem value="reorganization">Org Reorganization</SelectItem>
                  <SelectItem value="fast_track">Fast Track Elevation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Justification & Remarks</Label>
              <Textarea
                placeholder="Reasoning, committee approvals, or performance milestones..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  ...formData,
                  newSalary: formData.newSalary ? parseFloat(formData.newSalary) : undefined,
                })
              }
              disabled={!formData.employeeId || !formData.newDesignation || createMutation.isPending}
            >
              {createMutation.isPending ? "Recording..." : "Execute Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
