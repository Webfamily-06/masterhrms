import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  Users,
  Calendar,
  Layers,
  History,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/payroll/employee-salaries")({
  component: HrEmployeeSalariesPage,
});

export default function HrEmployeeSalariesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    ctcAnnual: 600000,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    taxRegime: "new",
    remarks: "Standard annual compensation assignment",
  });

  // 1. Fetch Assignments
  const { data: assignmentsData, isLoading, refetch } = useQuery({
    queryKey: ["hr-employee-salaries"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/employee-salaries");
      return res.data;
    },
  });

  // 2. Fetch Employees for Dropdown
  const { data: employeesData } = useQuery({
    queryKey: ["hr-employees-list-payroll"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/employees");
      return res.data;
    },
  });

  const assignments = assignmentsData?.assignments || [];
  const employees = employeesData?.employees || [];

  const filteredAssignments = assignments.filter((a: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = `${a.employee?.firstName || ""} ${a.employee?.lastName || ""}`.toLowerCase();
    const code = (a.employee?.employeeCode || "").toLowerCase();
    return name.includes(term) || code.includes(term);
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post("/api/v1/hr/payroll/employee-salaries/assign", payload);
    },
    onSuccess: () => {
      toast.success("Salary structure assigned successfully");
      setAssignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr-employee-salaries"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to assign salary");
    },
  });

  const totalPayrollLiability = assignments
    .filter((a: any) => a.isCurrent)
    .reduce((acc: number, a: any) => acc + Number(a.ctcMonthly || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Employee Salary Structures"
        description="Manage compensation structures, effective-dated salary revisions, and component breakdowns."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setAssignModalOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Assign / Revise Salary
          </Button>
        </div>
      </PageHeader>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Salaried Employees"
          value={assignments.filter((a: any) => a.isCurrent).length}
          description="Active salary structures assigned"
          icon={Users}
        />
        <StatCard
          title="Monthly Liability"
          value={`₹${totalPayrollLiability.toLocaleString("en-IN")}`}
          description="Gross monthly compensation liability"
          icon={DollarSign}
        />
        <StatCard
          title="Annualized Payroll"
          value={`₹${(totalPayrollLiability * 12).toLocaleString("en-IN")}`}
          description="Total company compensation run rate"
          icon={TrendingUp}
        />
        <StatCard
          title="Structure Types"
          value="Standard 50/20/30"
          description="Basic, HRA & Special Allowance"
          icon={Layers}
        />
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Salary Master Directory</CardTitle>
              <CardDescription>
                Historical and active compensation baselines with effective dates and tax regime assignments.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 text-left font-medium">Employee</th>
                  <th className="p-3 text-left font-medium">Department</th>
                  <th className="p-3 text-right font-medium">Annual CTC</th>
                  <th className="p-3 text-right font-medium">Monthly Gross</th>
                  <th className="p-3 text-left font-medium">Effective From</th>
                  <th className="p-3 text-center font-medium">Tax Regime</th>
                  <th className="p-3 text-center font-medium">State</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Loading salary records...
                    </td>
                  </tr>
                ) : filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No salary assignments found. Click "Assign / Revise Salary" to add.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold">
                        <div>{a.employee?.firstName} {a.employee?.lastName}</div>
                        <span className="text-xs text-muted-foreground font-mono">{a.employee?.employeeCode}</span>
                      </td>
                      <td className="p-3">{a.employee?.department?.name || "General"}</td>
                      <td className="p-3 text-right font-medium">
                        ₹{Number(a.ctcAnnual || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        ₹{Number(a.ctcMonthly || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {new Date(a.effectiveFrom).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="capitalize">
                          {a.taxRegime} Regime
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {a.isCurrent ? (
                          <Badge variant="default" className="bg-emerald-600">Current</Badge>
                        ) : (
                          <Badge variant="outline">Superseded</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedAssignment(a)}
                          className="gap-1"
                        >
                          <Layers className="h-3.5 w-3.5" /> Breakdown
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Salary Dialog */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign or Revise Employee Salary</DialogTitle>
            <DialogDescription>
              Set effective-dated compensation. Previous structure will be preserved in historical revisions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Employee</label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full border rounded-md p-2 bg-background text-sm"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Annual CTC (₹)</label>
                <Input
                  type="number"
                  value={formData.ctcAnnual}
                  onChange={(e) => setFormData({ ...formData, ctcAnnual: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Monthly Equivalent</label>
                <div className="p-2 border rounded-md bg-muted/30 font-bold text-sm text-emerald-600">
                  ₹{Math.round(formData.ctcAnnual / 12).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Effective From</label>
                <Input
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tax Regime</label>
                <select
                  value={formData.taxRegime}
                  onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
                  className="w-full border rounded-md p-2 bg-background text-sm"
                >
                  <option value="new">New Tax Regime (Default)</option>
                  <option value="old">Old Tax Regime</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks / Reason</label>
              <Input
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="e.g. Annual Appraisal Increment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => assignMutation.mutate(formData)}
              disabled={assignMutation.isPending || !formData.employeeId}
            >
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Breakdown Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Component Breakdown</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.employee?.firstName} {selectedAssignment?.employee?.lastName} • Annual CTC: ₹{Number(selectedAssignment?.ctcAnnual || 0).toLocaleString("en-IN")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="border rounded-md divide-y text-sm">
              {selectedAssignment?.items?.map((item: any) => (
                <div key={item.id} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{item.component?.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">({item.component?.code})</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₹{Number(item.monthlyAmount).toLocaleString("en-IN")}/mo</div>
                    <div className="text-xs text-muted-foreground">₹{Number(item.annualAmount).toLocaleString("en-IN")}/yr</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedAssignment(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
