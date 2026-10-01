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
  Coins,
  CheckCircle2,
  DollarSign,
  Star,
  Globe,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/currencies")({
  component: CurrenciesPage,
});

interface CurrencyItem {
  id: string;
  name: string;
  symbol: string;
  code: string;
  position: "Front" | "Behind";
  isDefault: boolean;
}

const DEFAULT_CURRENCIES: CurrencyItem[] = [
  { id: "cur-1", name: "Indian Rupee", symbol: "₹", code: "INR", position: "Front", isDefault: true },
  { id: "cur-2", name: "US Dollar", symbol: "$", code: "USD", position: "Front", isDefault: false },
  { id: "cur-3", name: "Euro", symbol: "€", code: "EUR", position: "Behind", isDefault: false },
  { id: "cur-4", name: "British Pound", symbol: "£", code: "GBP", position: "Front", isDefault: false },
  { id: "cur-5", name: "UAE Dirham", symbol: "AED", code: "AED", position: "Front", isDefault: false },
  { id: "cur-6", name: "Singapore Dollar", symbol: "S$", code: "SGD", position: "Front", isDefault: false },
  { id: "cur-7", name: "Japanese Yen", symbol: "¥", code: "JPY", position: "Front", isDefault: false },
  { id: "cur-8", name: "Australian Dollar", symbol: "A$", code: "AUD", position: "Front", isDefault: false },
];

export function CurrenciesPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenantId;

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [code, setCode] = useState("");
  const [position, setPosition] = useState<"Front" | "Behind">("Front");

  // Query CMS Currencies page
  const { data: cmsPage, isLoading } = useQuery({
    queryKey: ["system-currencies", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/api/cms/pages/system-currencies");
      } catch {
        return null;
      }
    },
  });

  const currencies: CurrencyItem[] = useMemo(() => {
    if (cmsPage?.content?.currencies && Array.isArray(cmsPage.content.currencies)) {
      return cmsPage.content.currencies;
    }
    return DEFAULT_CURRENCIES;
  }, [cmsPage]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (updatedList: CurrencyItem[]) =>
      api.put("/api/cms/pages/system-currencies", {
        slug: "system-currencies",
        title: "System Currencies Configuration",
        content: { currencies: updatedList },
        published: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-currencies"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to persist currency configuration");
    },
  });

  const resetForm = () => {
    setName("");
    setSymbol("");
    setCode("");
    setPosition("Front");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim() || !code.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    const newCur: CurrencyItem = {
      id: `cur-${Date.now()}`,
      name: name.trim(),
      symbol: symbol.trim(),
      code: code.trim().toUpperCase(),
      position,
      isDefault: false,
    };
    const updated = [...currencies, newCur];
    saveMutation.mutate(updated, {
      onSuccess: () => {
        toast.success(`Currency "${newCur.name}" added`);
        setIsAddOpen(false);
        resetForm();
      },
    });
  };

  const openEdit = (cur: CurrencyItem) => {
    setEditingCurrency(cur);
    setName(cur.name);
    setSymbol(cur.symbol);
    setCode(cur.code);
    setPosition(cur.position);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCurrency) return;
    const updated = currencies.map((c) =>
      c.id === editingCurrency.id
        ? {
            ...c,
            name: name.trim(),
            symbol: symbol.trim(),
            code: code.trim().toUpperCase(),
            position,
          }
        : c
    );
    saveMutation.mutate(updated, {
      onSuccess: () => {
        toast.success(`Currency "${name}" updated`);
        setEditingCurrency(null);
      },
    });
  };

  const handleSetDefault = (id: string) => {
    const updated = currencies.map((c) => ({
      ...c,
      isDefault: c.id === id,
    }));
    saveMutation.mutate(updated, {
      onSuccess: () => {
        toast.success("Default system currency updated");
      },
    });
  };

  const handleDelete = (id: string) => {
    const target = currencies.find((c) => c.id === id);
    if (target?.isDefault) {
      toast.error("Cannot delete the default active currency");
      return;
    }
    const updated = currencies.filter((c) => c.id !== id);
    saveMutation.mutate(updated, {
      onSuccess: () => {
        toast.success("Currency removed");
        setDeleteTargetId(null);
      },
    });
  };

  // Filtered List
  const filteredCurrencies = useMemo(() => {
    return currencies.filter((c) => {
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        c.symbol.toLowerCase().includes(term)
      );
    });
  }, [currencies, searchTerm]);

  // Aggregate Metrics
  const defaultCurrency = currencies.find((c) => c.isDefault) || currencies[0];
  const frontCount = currencies.filter((c) => c.position === "Front").length;
  const behindCount = currencies.filter((c) => c.position === "Behind").length;

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
            <span className="text-foreground font-medium">Currencies</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Currencies & FX Exchange
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage international currency symbols, formatting positions, and default financial presentation.
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
          Add New Currency
        </Button>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Currencies</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{currencies.length}</h3>
            <span className="text-xs text-muted-foreground">ISO standard currencies</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Globe className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Default Active</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {defaultCurrency?.code} ({defaultCurrency?.symbol})
            </h3>
            <span className="text-xs text-muted-foreground truncate block max-w-[140px]">
              {defaultCurrency?.name}
            </span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Star className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Symbol Prefix (Front)</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{frontCount}</h3>
            <span className="text-xs text-muted-foreground">e.g. $100 or ₹100</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Symbol Suffix (Behind)</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{behindCount}</h3>
            <span className="text-xs text-muted-foreground">e.g. 100 €</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Coins className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Table Toolbar ── */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search currency, symbol, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredCurrencies.length}</span> of {currencies.length} currencies
          </div>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead>Currency Symbol</TableHead>
              <TableHead>Currency Position</TableHead>
              <TableHead>Currency Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Loading currencies...
                </TableCell>
              </TableRow>
            ) : filteredCurrencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Coins className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                  <p className="text-sm font-medium">No currencies found</p>
                  <p className="text-xs mt-1">Add a currency to support multi-currency invoicing</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCurrencies.map((cur) => (
                <TableRow key={cur.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{cur.name}</span>
                      {cur.isDefault && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                          System Default
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-base font-bold text-foreground">
                    {cur.symbol}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {cur.position}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-foreground">
                    {cur.code}
                  </TableCell>
                  <TableCell>
                    {cur.isDefault ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                        Default
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
                        <DropdownMenuItem onClick={() => openEdit(cur)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        {!cur.isDefault && (
                          <DropdownMenuItem onClick={() => handleSetDefault(cur.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                            Make Default
                          </DropdownMenuItem>
                        )}
                        {!cur.isDefault && (
                          <DropdownMenuItem
                            onClick={() => setDeleteTargetId(cur.id)}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Currency
                          </DropdownMenuItem>
                        )}
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
        open={isAddOpen || !!editingCurrency}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingCurrency(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCurrency ? "Edit Currency" : "Add New Currency"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingCurrency ? handleUpdate : handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Currency Name *</Label>
              <Input
                placeholder="e.g. US Dollar or Euro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Currency Symbol *</Label>
                <Input
                  placeholder="e.g. $ or €"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency Code *</Label>
                <Input
                  placeholder="USD"
                  maxLength={5}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Currency Position *</Label>
              <Select
                value={position}
                onValueChange={(val: "Front" | "Behind") => setPosition(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Front">Front (e.g. $100)</SelectItem>
                  <SelectItem value="Behind">Behind (e.g. 100 $)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingCurrency(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? "Saving..."
                  : editingCurrency
                  ? "Save Changes"
                  : "Add Currency"}
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
            <DialogTitle className="text-center">Delete Currency</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this currency from your workspace?
          </p>
          <DialogFooter className="mt-4 sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saveMutation.isPending}
              onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
