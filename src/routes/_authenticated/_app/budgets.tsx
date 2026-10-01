import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { formatSystemAmount } from "@/lib/currency";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  PieChart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/budgets")({
  component: BudgetsPage,
});

interface BudgetRecord {
  id: string;
  name: string;
  fiscalYear: string;
  periodType: string;
  departmentId: string | null;
  departmentName: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  status: string;
  notes: string;
  createdAt: string;
}

interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallUtilization: number;
  activePlans: number;
  totalPlans: number;
}

export function BudgetsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenantId;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const currentYear = new Date().getFullYear();
  const defaultFiscal = `${currentYear}-${currentYear + 1}`;
  const [formData, setFormData] = useState({
    name: "",
    fiscalYear: defaultFiscal,
    periodType: "monthly",
    departmentId: "all",
    budgetedAmount: "",
    spentAmount: "0",
    notes: "",
  });

  // Fetch Budgets
  const { data: budgets = [], isLoading } = useQuery<BudgetRecord[]>({
    queryKey: ["budgets", tenantId, statusFilter, yearFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (yearFilter !== "all") params.append("fiscalYear", yearFilter);
      return api.get(`/api/budgets?${params.toString()}`);
    },
    enabled: !!tenantId,
  });

  // Fetch Budget Summary
  const { data: summary } = useQuery<BudgetSummary>({
    queryKey: ["budgets-summary", tenantId],
    queryFn: async () => api.get("/api/budgets/summary"),
    enabled: !!tenantId,
  });

  // Fetch Departments
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["departments", tenantId],
    queryFn: async () => {
      const res = await api.get("/api/departments");
      return Array.isArray(res) ? res : res.data || [];
    },
    enabled: !!tenantId,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => api.post("/api/budgets", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budgets-summary"] });
      toast.success("Budget plan created successfully");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create budget plan");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put(`/api/budgets/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budgets-summary"] });
      toast.success("Budget plan updated");
      setEditingBudget(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update budget plan");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/budgets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budgets-summary"] });
      toast.success("Budget plan removed");
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete budget plan");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      fiscalYear: defaultFiscal,
      periodType: "monthly",
      departmentId: "all",
      budgetedAmount: "",
      spentAmount: "0",
      notes: "",
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.budgetedAmount) {
      toast.error("Please enter a name and budgeted amount");
      return;
    }
    createMutation.mutate({
      ...formData,
      budgetedAmount: parseFloat(formData.budgetedAmount),
      spentAmount: parseFloat(formData.spentAmount || "0"),
    });
  };

  const openEdit = (budget: BudgetRecord) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      fiscalYear: budget.fiscalYear,
      periodType: budget.periodType,
      departmentId: budget.departmentId || "all",
      budgetedAmount: String(budget.budgetedAmount),
      spentAmount: String(budget.spentAmount),
      notes: budget.notes || "",
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    updateMutation.mutate({
      id: editingBudget.id,
      body: {
        ...formData,
        budgetedAmount: parseFloat(formData.budgetedAmount),
        spentAmount: parseFloat(formData.spentAmount || "0"),
      },
    });
  };

  // Filtered List
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const term = searchTerm.toLowerCase();
      const name = b.name.toLowerCase();
      const dept = b.departmentName.toLowerCase();
      const fiscal = b.fiscalYear.toLowerCase();

      return name.includes(term) || dept.includes(term) || fiscal.includes(term);
    });
  }, [budgets, searchTerm]);

  // Unique Fiscal Years
  const fiscalYears = useMemo(() => {
    const set = new Set(budgets.map((b) => b.fiscalYear));
    set.add(defaultFiscal);
    return Array.from(set).sort().reverse();
  }, [budgets, defaultFiscal]);

  const getProgressColor = (pct: number) => {
    if (pct >= 90) return "bg-rose-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Breadcrumb & Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/accounting" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <Link to="/finance-dashboard" className="hover:text-primary transition-colors">Accounting</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Budgets</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-primary" />
            Budgets & Expense Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set fiscal budgets by department and timeframe, track spending commitments, and guard against cost overruns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/expenses">
            <Button variant="outline" size="sm" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              Expense Claims
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Budget Plan
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Allocated</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">
              {formatSystemAmount(summary?.totalBudgeted || 0)}
            </h3>
            <span className="text-xs text-muted-foreground">{summary?.totalPlans || 0} budget plans</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <PiggyBank className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Actual Spent</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">
              {formatSystemAmount(summary?.totalSpent || 0)}
            </h3>
            <span className="text-xs text-muted-foreground">Committed expenses</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Remaining Buffer</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {formatSystemAmount(summary?.totalRemaining || 0)}
            </h3>
            <span className="text-xs text-muted-foreground">Available funds</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Overall Burn Rate</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">
              {summary?.overallUtilization || 0}%
            </h3>
            <span className="text-xs text-muted-foreground">Spend vs Allocation</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <PieChart className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Table Toolbar ── */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plan name, department, fiscal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Fiscal Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fiscal Years</SelectItem>
                {fiscalYears.map((fy) => (
                  <SelectItem key={fy} value={fy}>
                    {fy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Data Table ── */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Budget Title & Scope</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Fiscal Period</TableHead>
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="w-[180px]">Utilization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Loading budget plans...
                  </TableCell>
                </TableRow>
              ) : filteredBudgets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <PiggyBank className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                    <p className="text-sm font-medium">No budget plans found</p>
                    <p className="text-xs mt-1">Create a budget plan to track departmental allocations</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBudgets.map((b) => (
                  <TableRow key={b.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{b.name}</p>
                        {b.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{b.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{b.departmentName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{b.fiscalYear}</span>
                        <span className="text-xs text-muted-foreground capitalize">({b.periodType})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm text-foreground">
                      {formatSystemAmount(b.budgetedAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm text-foreground">
                      {formatSystemAmount(b.spentAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      <span className={b.remainingAmount > 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                        {formatSystemAmount(b.remainingAmount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{b.utilizationPercentage}%</span>
                          {b.utilizationPercentage >= 100 && (
                            <span className="text-rose-600 flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" /> Over
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getProgressColor(b.utilizationPercentage)}`}
                            style={{ width: `${Math.min(100, b.utilizationPercentage)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          b.status === "active"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                            : "border-muted text-muted-foreground"
                        }
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(b)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Budget
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTargetId(b.id)}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Budget
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={isAddOpen || !!editingBudget}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingBudget(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? "Edit Budget Plan" : "Add Budget Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingBudget ? handleUpdate : handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Budget Plan Title *</Label>
              <Input
                placeholder="e.g. Q4 Engineering & Hardware Expansion"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fiscal Year *</Label>
                <Input
                  placeholder="2026-2027"
                  value={formData.fiscalYear}
                  onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Period Scope *</Label>
                <Select
                  value={formData.periodType}
                  onValueChange={(val) => setFormData({ ...formData, periodType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Annual / Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Department Scope</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(val) => setFormData({ ...formData, departmentId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">Organization Wide (All)</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Allocated Budget *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 500000"
                  value={formData.budgetedAmount}
                  onChange={(e) => setFormData({ ...formData, budgetedAmount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Initial Spent</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.spentAmount}
                  onChange={(e) => setFormData({ ...formData, spentAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes & Justification</Label>
              <Textarea
                placeholder="Business justification or line-item breakdown..."
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingBudget(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingBudget
                  ? "Save Changes"
                  : "Create Budget Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Delete Budget Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this budget plan? Spending histories and ledger transactions will not be modified.
          </p>
          <DialogFooter className="mt-4 sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
