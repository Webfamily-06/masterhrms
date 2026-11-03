'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Layers,
  Plus,
  RefreshCw,
  Search,
  Calculator,
  CheckCircle2,
  Trash2,
  Edit,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Percent,
  DollarSign,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface ComponentItem {
  componentId: string;
  code: string;
  name: string;
  type: string;
  calculationType: string;
  value: number;
  formula?: string;
  sortOrder: number;
  includeInPf: boolean;
  includeInEsi: boolean;
  isTaxable: boolean;
}

export default function HrSalaryStructuresPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [structureName, setStructureName] = useState("");
  const [structureDesc, setStructureDesc] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [baseCalculationDays, setBaseCalculationDays] = useState(26);
  const [selectedItems, setSelectedItems] = useState<ComponentItem[]>([]);

  // Simulation State
  const [simCtcMonthly, setSimCtcMonthly] = useState(50000);
  const [simState, setSimState] = useState("TN");
  const [simResult, setSimResult] = useState<any | null>(null);

  // 1. Fetch Salary Structures
  const { data: structuresData, isLoading: structuresLoading, refetch: refetchStructures } = useQuery({
    queryKey: ["hr-salary-structures"],
    queryFn: async () => {
      const res = await api.get("/api/payroll/salary-structures");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  // 2. Fetch Available Salary Components
  const { data: componentsData } = useQuery({
    queryKey: ["hr-salary-components"],
    queryFn: async () => {
      const res = await api.get("/api/payroll/salary-components");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const structures: any[] = structuresData || [];
  const components: any[] = componentsData || [];

  const filteredStructures = structures.filter((s: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(term) || (s.description || "").toLowerCase().includes(term);
  });

  // Open Create Modal with default items
  const handleOpenCreate = () => {
    setEditingId(null);
    setStructureName("");
    setStructureDesc("");
    setIsDefault(false);
    setBaseCalculationDays(26);

    // Seed default standard items if components exist
    const defaultBasic = components.find((c: any) => c.code === "BASIC");
    const defaultHra = components.find((c: any) => c.code === "HRA");
    const defaultSpecial = components.find((c: any) => c.code === "SPECIAL");

    const initialItems: ComponentItem[] = [];
    if (defaultBasic) {
      initialItems.push({
        componentId: defaultBasic.id,
        code: defaultBasic.code,
        name: defaultBasic.name,
        type: defaultBasic.type,
        calculationType: "percentage_of_ctc",
        value: 50,
        sortOrder: 1,
        includeInPf: defaultBasic.includeInPf,
        includeInEsi: defaultBasic.includeInEsi,
        isTaxable: defaultBasic.isTaxable,
      });
    }
    if (defaultHra) {
      initialItems.push({
        componentId: defaultHra.id,
        code: defaultHra.code,
        name: defaultHra.name,
        type: defaultHra.type,
        calculationType: "percentage_of_ctc",
        value: 20,
        sortOrder: 2,
        includeInPf: defaultHra.includeInPf,
        includeInEsi: defaultHra.includeInEsi,
        isTaxable: defaultHra.isTaxable,
      });
    }
    if (defaultSpecial) {
      initialItems.push({
        componentId: defaultSpecial.id,
        code: defaultSpecial.code,
        name: defaultSpecial.name,
        type: defaultSpecial.type,
        calculationType: "percentage_of_ctc",
        value: 15,
        sortOrder: 3,
        includeInPf: defaultSpecial.includeInPf,
        includeInEsi: defaultSpecial.includeInEsi,
        isTaxable: defaultSpecial.isTaxable,
      });
    }

    setSelectedItems(initialItems);
    setBuilderModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (struct: any) => {
    setEditingId(struct.id);
    setStructureName(struct.name);
    setStructureDesc(struct.description || "");
    setIsDefault(struct.isDefault);
    setBaseCalculationDays(struct.baseCalculationDays || 26);

    const items: ComponentItem[] = (struct.items || []).map((i: any, idx: number) => ({
      componentId: i.componentId,
      code: i.component?.code || "COMP",
      name: i.component?.name || "Component",
      type: i.component?.type || "earning",
      calculationType: i.calculationType || "percentage_of_ctc",
      value: Number(i.value || 0),
      formula: i.formula || "",
      sortOrder: idx + 1,
      includeInPf: i.component?.includeInPf ?? true,
      includeInEsi: i.component?.includeInEsi ?? true,
      isTaxable: i.component?.isTaxable ?? true,
    }));

    setSelectedItems(items);
    setBuilderModalOpen(true);
  };

  // Add component to template builder
  const handleAddComponent = (comp: any) => {
    if (selectedItems.some((i) => i.componentId === comp.id)) {
      toast.error(`${comp.name} is already added to this structure.`);
      return;
    }
    const newItem: ComponentItem = {
      componentId: comp.id,
      code: comp.code,
      name: comp.name,
      type: comp.type,
      calculationType: comp.calculationType || "percentage_of_ctc",
      value: Number(comp.defaultValue || 10),
      formula: "",
      sortOrder: selectedItems.length + 1,
      includeInPf: comp.includeInPf,
      includeInEsi: comp.includeInEsi,
      isTaxable: comp.isTaxable,
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  // Remove component from template builder
  const handleRemoveComponent = (idx: number) => {
    const updated = selectedItems.filter((_, i) => i !== idx);
    setSelectedItems(updated.map((item, i) => ({ ...item, sortOrder: i + 1 })));
  };

  // Update item field
  const handleUpdateItem = (idx: number, field: string, val: any) => {
    const updated = [...selectedItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setSelectedItems(updated);
  };

  // Live simulation mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ctcMonthly: simCtcMonthly,
        items: selectedItems,
        state: simState,
      };
      const res = await api.post("/api/payroll/salary-structures/preview", payload);
      return (res as any)?.data || res;
    },
    onSuccess: (data: any) => {
      setSimResult(data);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to calculate simulation preview.");
    },
  });

  // Save Structure Mutation (Create or Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: structureName.trim(),
        description: structureDesc.trim() || null,
        isDefault,
        baseCalculationDays,
        items: selectedItems.map((item, idx) => ({
          componentId: item.componentId,
          calculationType: item.calculationType,
          value: item.value,
          formula: item.formula || null,
          sortOrder: idx + 1,
        })),
      };

      if (editingId) {
        return api.put(`/api/payroll/salary-structures/${editingId}`, payload);
      } else {
        return api.post("/api/payroll/salary-structures", payload);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Salary structure updated successfully" : "Salary structure created successfully");
      setBuilderModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr-salary-structures"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save salary structure");
    },
  });

  // Delete Structure Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/payroll/salary-structures/${id}`);
    },
    onSuccess: () => {
      toast.success("Salary structure deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-salary-structures"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Cannot delete salary structure");
    },
  });

  const totalPercentage = selectedItems
    .filter((i) => i.calculationType === "percentage_of_ctc" && i.type === "earning")
    .reduce((acc, i) => acc + Number(i.value || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Salary Structure Template Builder"
        description="Design and manage versioned compensation structures with dynamic percentage and fixed formulas."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetchStructures()}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4" /> New Structure Template
          </Button>
        </div>
      </PageHeader>

      {/* Metric Cards */}
      <StatsOverviewGrid>
        <StatCard
          title="Active Structures"
          value={structures.length.toString()}
          description="Tenant compensation models"
          icon={Layers}
        />
        <StatCard
          title="Available Components"
          value={components.length.toString()}
          description="Earning & deduction library"
          icon={Calculator}
        />
        <StatCard
          title="Default Structure"
          value={structures.find((s: any) => s.isDefault)?.name || "Standard Corporate"}
          description="Applied to new joiners"
          icon={CheckCircle2}
        />
        <StatCard
          title="Statutory Policy"
          value="EPFO & ESIC Compliant"
          description="Central & Tamil Nadu rules"
          icon={ShieldCheck}
        />
      </StatsOverviewGrid>

      {/* Structure Registry Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Configured Salary Structure Templates</CardTitle>
              <CardDescription>
                Templates dynamically evaluated by the monthly payroll calculation engine.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
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
                  <th className="p-3 text-left font-medium">Template Name</th>
                  <th className="p-3 text-left font-medium">Description</th>
                  <th className="p-3 text-center font-medium">Base Days</th>
                  <th className="p-3 text-center font-medium">Frequency</th>
                  <th className="p-3 text-center font-medium">Components</th>
                  <th className="p-3 text-center font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {structuresLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Loading salary structures...
                    </td>
                  </tr>
                ) : filteredStructures.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No structures found. Click "New Structure Template" to configure one.
                    </td>
                  </tr>
                ) : (
                  filteredStructures.map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                        {s.name}
                        {s.isDefault && (
                          <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">
                            Default
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate">
                        {s.description || "No description provided"}
                      </td>
                      <td className="p-3 text-center font-mono">{s.baseCalculationDays || 26}</td>
                      <td className="p-3 text-center capitalize">{s.payFrequency || "monthly"}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="font-mono">
                          {s.items?.length || 0} components
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Active
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(s)}
                            className="h-8 px-2 text-indigo-600 hover:text-indigo-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={s.isDefault || deleteMutation.isPending}
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${s.name}"?`)) {
                                deleteMutation.mutate(s.id);
                              }
                            }}
                            className="h-8 px-2 text-rose-600 hover:text-rose-700 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Template Builder Dialog */}
      <Dialog open={builderModalOpen} onOpenChange={setBuilderModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Salary Structure Template" : "Create Salary Structure Template"}
            </DialogTitle>
            <DialogDescription>
              Configure salary component allocations, percentage splits, and fixed monthly amounts.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-3">
            {/* Left: Template Details & Components */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Structure Name *</label>
                <Input
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  placeholder="e.g. Agency Staffing Contract (Basic + Bonus)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={structureDesc}
                  onChange={(e) => setStructureDesc(e.target.value)}
                  placeholder="e.g. Customized contract without conveyance or medical allowances"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Base Calculation Days</label>
                  <select
                    value={baseCalculationDays}
                    onChange={(e) => setBaseCalculationDays(Number(e.target.value))}
                    className="w-full border rounded-md p-2 bg-background text-sm"
                  >
                    <option value={26}>26 Days (Standard)</option>
                    <option value={30}>30 Days (Calendar Fixed)</option>
                    <option value={31}>Actual Calendar Days</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="rounded border"
                    />
                    Mark as Default Structure
                  </label>
                </div>
              </div>

              {/* Component Allocation Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Component Allocation</label>
                  <span className={`text-xs font-bold ${totalPercentage > 100 ? "text-rose-600" : "text-muted-foreground"}`}>
                    Total CTC Allocation: {totalPercentage}%
                  </span>
                </div>

                <div className="space-y-2 border rounded-md p-2 max-h-60 overflow-y-auto">
                  {selectedItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No components added yet. Select from the library below.
                    </p>
                  ) : (
                    selectedItems.map((item, idx) => (
                      <div key={item.componentId} className="flex items-center gap-2 bg-muted/40 p-2 rounded text-xs">
                        <span className="font-mono font-bold w-20 truncate">{item.code}</span>
                        <select
                          value={item.calculationType}
                          onChange={(e) => handleUpdateItem(idx, "calculationType", e.target.value)}
                          className="border rounded p-1 text-xs bg-background"
                        >
                          <option value="percentage_of_ctc">% of CTC</option>
                          <option value="percentage_of_basic">% of Basic</option>
                          <option value="fixed">Fixed ₹</option>
                        </select>
                        <Input
                          type="number"
                          value={item.value}
                          onChange={(e) => handleUpdateItem(idx, "value", Number(e.target.value))}
                          className="h-7 w-20 text-xs font-mono"
                        />
                        <span className="text-muted-foreground">
                          {item.calculationType === "fixed" ? "₹/mo" : "%"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveComponent(idx)}
                          className="h-6 w-6 p-0 ml-auto text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Available Library Selector */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs text-muted-foreground">Add from Component Library:</label>
                  <div className="flex flex-wrap gap-1">
                    {components
                      .filter((c: any) => !selectedItems.some((i) => i.componentId === c.id))
                      .map((c: any) => (
                        <Button
                          key={c.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddComponent(c)}
                          className="h-6 text-[11px] px-2 gap-1 border-dashed"
                        >
                          <Plus className="h-3 w-3" /> {c.name}
                        </Button>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Simulation & Preview Calculator */}
            <div className="space-y-4 border-l pl-6">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-indigo-600" /> Real-Time Simulation Preview
                </h4>
                <p className="text-xs text-muted-foreground">
                  Simulate dynamic proration and statutory outputs using this template before saving.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Sample Monthly CTC (₹)</label>
                  <Input
                    type="number"
                    value={simCtcMonthly}
                    onChange={(e) => setSimCtcMonthly(Number(e.target.value))}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Assessment State</label>
                  <select
                    value={simState}
                    onChange={(e) => setSimState(e.target.value)}
                    className="w-full border rounded-md p-1.5 bg-background text-xs"
                  >
                    <option value="TN">Tamil Nadu (TN)</option>
                    <option value="KA">Karnataka (KA)</option>
                    <option value="MH">Maharashtra (MH)</option>
                    <option value="DL">Delhi (DL - Nil PT)</option>
                  </select>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending || selectedItems.length === 0}
                className="w-full gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Calculator className="h-3.5 w-3.5" /> Calculate Live Breakdown
              </Button>

              {/* Simulation Result Output */}
              {simResult?.breakdown && (
                <div className="rounded-md border p-3 bg-muted/20 space-y-2 text-xs">
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-semibold text-muted-foreground">Earned Basic:</span>
                    <span className="font-mono font-bold">₹{simResult.breakdown.earnings.basicSalary.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-semibold text-muted-foreground">Special Allowance:</span>
                    <span className="font-mono font-bold">₹{simResult.breakdown.earnings.specialAllowance.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-semibold text-muted-foreground">Total Gross Wages:</span>
                    <span className="font-mono font-bold text-indigo-600">₹{simResult.breakdown.earnings.totalGross.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1 text-rose-600">
                    <span>EPF Employee (12%):</span>
                    <span className="font-mono font-bold">-₹{simResult.breakdown.deductions.providentFund.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1 text-rose-600">
                    <span>ESI Employee:</span>
                    <span className="font-mono font-bold">-₹{simResult.breakdown.deductions.esi.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1 text-rose-600">
                    <span>Professional Tax (PT):</span>
                    <span className="font-mono font-bold">-₹{simResult.breakdown.deductions.professionalTax.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-sm text-emerald-600">
                    <span>Estimated Net Pay:</span>
                    <span className="font-mono">₹{simResult.breakdown.netPay.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !structureName || selectedItems.length === 0}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Save Structure Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

