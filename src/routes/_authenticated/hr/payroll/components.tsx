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
  Sliders,
  Plus,
  RefreshCw,
  Search,
  Calculator,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/payroll/components")({
  component: HrPayrollComponentsPage,
});

export default function HrPayrollComponentsPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formulaTesterOpen, setFormulaTesterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Formula Tester state
  const [formulaToTest, setFormulaToTest] = useState("BASIC * 0.4");
  const [formulaResult, setFormulaResult] = useState<any | null>(null);

  // New Component state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "earning",
    calculationType: "flat",
    defaultValue: 0,
    isTaxable: true,
    isStatutory: false,
    includeInPf: true,
    includeInEsi: true,
    description: "",
  });

  // 1. Fetch Components & Structures
  const { data: compData, isLoading, refetch } = useQuery({
    queryKey: ["hr-payroll-components"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/components");
      return res.data;
    },
  });

  const components = compData?.components || [];
  const structures = compData?.structures || [];

  const filteredComponents = components.filter((c: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term);
  });

  // Create Component Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post("/api/v1/hr/payroll/components", payload);
    },
    onSuccess: () => {
      toast.success("Salary component created successfully");
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-components"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create component");
    },
  });

  // Test Formula Mutation
  const testFormulaMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/v1/hr/payroll/components/test-formula", {
        formula: formulaToTest,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setFormulaResult(data);
      toast.success("Formula evaluated successfully");
    },
    onError: (err: any) => {
      setFormulaResult({ error: err.response?.data?.error || "Evaluation failed" });
      toast.error(err.response?.data?.error || "Formula evaluation error");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Salary Components & Formula Engine"
        description="Configure earnings, deductions, and statutory multipliers with dependency-ordered formula testing."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setFormulaTesterOpen(true)}
            className="gap-1.5 border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <Calculator className="h-4 w-4" /> Formula Tester
          </Button>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Component
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Components"
          value={components.length}
          description="Earning & deduction components"
          icon={Sliders}
        />
        <StatCard
          title="Earnings Elements"
          value={components.filter((c: any) => c.type === "earning").length}
          description="Basic, HRA, Allowances"
          icon={Layers}
        />
        <StatCard
          title="Deductions"
          value={components.filter((c: any) => c.type === "deduction").length}
          description="Statutory & custom deductions"
          icon={Calculator}
        />
        <StatCard
          title="Formula Engine"
          value="DAG Active"
          description="Circular dependency protected"
          icon={CheckCircle2}
        />
      </div>

      {/* Components Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Active Salary Components</CardTitle>
              <CardDescription>
                Component parameters utilized by the monthly batch payroll calculation engine.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search component code/name..."
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
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Code</th>
                  <th className="p-3 text-left font-medium">Classification</th>
                  <th className="p-3 text-left font-medium">Calculation Type</th>
                  <th className="p-3 text-center font-medium">Taxable</th>
                  <th className="p-3 text-center font-medium">PF Wage</th>
                  <th className="p-3 text-center font-medium">ESI Wage</th>
                  <th className="p-3 text-center font-medium">Statutory</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Loading components...
                    </td>
                  </tr>
                ) : filteredComponents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No components found. Click "New Component" to add.
                    </td>
                  </tr>
                ) : (
                  filteredComponents.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold">{c.name}</td>
                      <td className="p-3 font-mono text-xs">{c.code}</td>
                      <td className="p-3">
                        <Badge
                          variant={c.type === "earning" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {c.type}
                        </Badge>
                      </td>
                      <td className="p-3 capitalize">{c.calculationType.replace(/_/g, " ")}</td>
                      <td className="p-3 text-center">
                        {c.isTaxable ? (
                          <span className="text-emerald-600 font-bold">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">Exempt</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {c.includeInPf ? (
                          <Badge variant="outline" className="border-blue-500 text-blue-600">Included</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {c.includeInEsi ? (
                          <Badge variant="outline" className="border-purple-500 text-purple-600">Included</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {c.isStatutory ? (
                          <Badge variant="default" className="bg-amber-600 text-white">Statutory</Badge>
                        ) : (
                          <span className="text-muted-foreground">Custom</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Formula Tester Dialog */}
      <Dialog open={formulaTesterOpen} onOpenChange={setFormulaTesterOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Controlled Formula Tester</DialogTitle>
            <DialogDescription>
              Test mathematical expressions against sample employee variables. Safely verified via AST parser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Formula Expression</label>
              <Input
                value={formulaToTest}
                onChange={(e) => setFormulaToTest(e.target.value)}
                placeholder="e.g. BASIC * 0.5 + SPECIAL * 0.1"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Available variables: BASIC (25,000), HRA (10,000), SPECIAL (10,000), CTC (50,000), WORKING_DAYS (30), PAYABLE_DAYS (30)
              </p>
            </div>

            {formulaResult && (
              <div className="p-4 border rounded-md bg-muted/20 space-y-2">
                <span className="text-xs font-bold uppercase text-muted-foreground">Evaluation Trace</span>
                {formulaResult.error ? (
                  <div className="text-destructive font-mono text-sm flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> {formulaResult.error}
                  </div>
                ) : (
                  <div className="text-emerald-600 font-mono text-lg font-bold">
                    Computed Output: ₹{Number(formulaResult.result).toLocaleString("en-IN")}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormulaTesterOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => testFormulaMutation.mutate()}
              disabled={testFormulaMutation.isPending}
              className="gap-1.5"
            >
              <Calculator className="h-4 w-4" /> Evaluate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Component Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Salary Component</DialogTitle>
            <DialogDescription>
              Add a new earning, deduction, or reimbursement element to the compensation library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Component Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Internet Allowance"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Code (Identifier)</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. INTERNET_ALLOW"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded-md p-2 bg-background text-sm"
                >
                  <option value="earning">Earning</option>
                  <option value="deduction">Deduction</option>
                  <option value="reimbursement">Reimbursement</option>
                  <option value="statutory_employer">Employer Contribution</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Calculation Type</label>
                <select
                  value={formData.calculationType}
                  onChange={(e) => setFormData({ ...formData, calculationType: e.target.value })}
                  className="w-full border rounded-md p-2 bg-background text-sm"
                >
                  <option value="flat">Fixed / Flat Amount</option>
                  <option value="percentage_of_ctc">Percentage of CTC</option>
                  <option value="percentage_of_basic">Percentage of Basic</option>
                  <option value="formula">Formula Expression</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isTaxable}
                  onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                  className="rounded border"
                />
                Subject to Income Tax
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includeInPf}
                  onChange={(e) => setFormData({ ...formData, includeInPf: e.target.checked })}
                  className="rounded border"
                />
                Include in EPF Wage
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={createMutation.isPending || !formData.name || !formData.code}
            >
              Save Component
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
