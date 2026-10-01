import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Percent,
  Receipt,
  CheckCircle2,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/taxes")({
  component: TaxesPage,
});

interface TaxRateItem {
  id: string;
  name: string;
  rate: number;
  isDefault?: boolean;
}

export function TaxesPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenantId;

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRateItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // Query taxes
  const { data: rawTaxes = [], isLoading } = useQuery<TaxRateItem[]>({
    queryKey: ["taxes", tenantId],
    queryFn: async () => api.get("/api/products/taxes"),
    enabled: !!tenantId,
  });

  const taxes: TaxRateItem[] = useMemo(() => {
    return Array.isArray(rawTaxes) ? rawTaxes : [];
  }, [rawTaxes]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => api.post("/api/products/taxes", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax rate created successfully");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create tax rate");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put(`/api/products/taxes/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax rate updated");
      setEditingTax(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update tax rate");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/taxes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax rate deleted");
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete tax rate");
    },
  });

  const resetForm = () => {
    setName("");
    setRate("");
    setIsDefault(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || rate === "") {
      toast.error("Please fill in tax name and percentage");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      rate: parseFloat(rate),
      isDefault,
    });
  };

  const openEdit = (tax: TaxRateItem) => {
    setEditingTax(tax);
    setName(tax.name);
    setRate(String(tax.rate));
    setIsDefault(!!tax.isDefault);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTax) return;
    updateMutation.mutate({
      id: editingTax.id,
      body: {
        name: name.trim(),
        rate: parseFloat(rate),
        isDefault,
      },
    });
  };

  // Filtered List
  const filteredTaxes = useMemo(() => {
    return taxes.filter((t) => {
      const term = searchTerm.toLowerCase();
      return t.name.toLowerCase().includes(term) || String(t.rate).includes(term);
    });
  }, [taxes, searchTerm]);

  // Aggregate Metrics
  const totalTaxes = taxes.length;
  const defaultTax = taxes.find((t) => t.isDefault);
  const zeroTaxes = taxes.filter((t) => t.rate === 0).length;
  const standardRates = taxes.filter((t) => t.rate > 0 && t.rate <= 28).length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* ── Breadcrumb & Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/accounting" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <Link to="/settings" className="hover:text-primary transition-colors">Settings</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Taxes</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Percent className="h-6 w-6 text-primary" />
            Tax Rates & GST Slabs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure sales tax brackets, GST/VAT exemptions, and default percentages for invoices and POS checkout.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Tax Rate
        </Button>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Configured Rates</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{totalTaxes}</h3>
            <span className="text-xs text-muted-foreground">Active tax definitions</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Percent className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Default Rate</p>
            <h3 className="text-2xl font-bold mt-1 text-primary">
              {defaultTax ? `${defaultTax.rate}%` : "None"}
            </h3>
            <span className="text-xs text-muted-foreground truncate block max-w-[140px]">
              {defaultTax?.name || "Auto-assigned to items"}
            </span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Star className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Standard Slabs</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{standardRates}</h3>
            <span className="text-xs text-muted-foreground">Commercial percentages</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Zero-Rated</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{zeroTaxes}</h3>
            <span className="text-xs text-muted-foreground">Exempted / Export rules</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Table Toolbar ── */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tax name, percentage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredTaxes.length}</span> of {totalTaxes} rates
          </div>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[100px]">Tax ID</TableHead>
              <TableHead>Tax Name</TableHead>
              <TableHead className="text-right">Tax Percentage (%)</TableHead>
              <TableHead>Default Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Loading tax rates...
                </TableCell>
              </TableRow>
            ) : filteredTaxes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Percent className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                  <p className="text-sm font-medium">No tax rates found</p>
                  <p className="text-xs mt-1">Click "Add Tax Rate" to configure a GST or VAT slab</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTaxes.map((tax) => (
                <TableRow key={tax.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    #{tax.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{tax.name}</span>
                      {tax.isDefault && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-base text-foreground">
                    {tax.rate}%
                  </TableCell>
                  <TableCell>
                    {tax.isDefault ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                        Default System Rate
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(tax)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Rate
                        </DropdownMenuItem>
                        {!tax.isDefault && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateMutation.mutate({
                                id: tax.id,
                                body: { isDefault: true },
                              })
                            }
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                            Make Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeleteTargetId(tax.id)}
                          className="text-rose-600 focus:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Rate
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

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={isAddOpen || !!editingTax}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingTax(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTax ? "Edit Tax Rate" : "Add Tax Rate"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingTax ? handleUpdate : handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Tax Name *</Label>
              <Input
                placeholder="e.g. GST 18% (Standard Rate)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tax Percentage (%) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 18"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <Label htmlFor="isDefault" className="text-sm font-normal cursor-pointer">
                Set as default tax rate for new products and sales
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingTax(null);
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
                  : editingTax
                  ? "Save Changes"
                  : "Create Tax Rate"}
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
            <DialogTitle className="text-center">Delete Tax Rate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this tax rate? Historical invoices and billing records using this rate will remain unchanged.
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
