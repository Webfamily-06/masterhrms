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
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Users,
  LayoutGrid,
  List,
  Building,
  Mail,
  Phone,
  MapPin,
  Receipt,
  FileSpreadsheet,
  ExternalLink,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/clients")({
  component: ClientsPage,
});

interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  creditLimit: number | null;
  notes: string;
  ordersCount: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingReceivable: number;
  hasOutstandingBalance: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ClientsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenantId;

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CustomerItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gstin: "",
    creditLimit: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
    notes: "",
  });

  // Query customers
  const { data: rawCustomers = [], isLoading } = useQuery<CustomerItem[] | { data: CustomerItem[] }>({
    queryKey: ["customers", tenantId],
    queryFn: async () => api.get("/api/customers"),
    enabled: !!tenantId,
  });

  const customers: CustomerItem[] = useMemo(() => {
    if (Array.isArray(rawCustomers)) return rawCustomers;
    if (rawCustomers && Array.isArray((rawCustomers as any).data)) return (rawCustomers as any).data;
    return [];
  }, [rawCustomers]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => api.post("/api/customers", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Client added successfully");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add client");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put(`/api/customers/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Client updated successfully");
      setEditingClient(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update client");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Client deleted");
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete client");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      gstin: "",
      creditLimit: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
      notes: "",
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    createMutation.mutate({
      ...formData,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
    });
  };

  const openEdit = (client: CustomerItem) => {
    setEditingClient(client);
    setFormData({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      gstin: client.gstin || "",
      creditLimit: client.creditLimit ? String(client.creditLimit) : "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      country: client.country || "India",
      postalCode: client.postalCode || "",
      notes: client.notes || "",
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    updateMutation.mutate({
      id: editingClient.id,
      body: {
        ...formData,
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
      },
    });
  };

  // Filtered List
  const filteredClients = useMemo(() => {
    return customers.filter((c) => {
      const term = searchTerm.toLowerCase();
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const city = (c.city || "").toLowerCase();
      const gstin = (c.gstin || "").toLowerCase();

      return (
        name.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        city.includes(term) ||
        gstin.includes(term)
      );
    });
  }, [customers, searchTerm]);

  // Aggregate Metrics
  const totalClients = customers.length;
  const activeClients = customers.filter((c) => c.ordersCount > 0).length;
  const totalBilled = customers.reduce((sum, c) => sum + (c.totalInvoiced || 0), 0);
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingReceivable || 0), 0);

  // CSV Export
  const exportCSV = () => {
    const headers = ["ID", "Name", "Email", "Phone", "GSTIN", "City", "Country", "Orders", "Invoiced", "Receivable"];
    const rows = filteredClients.map((c) => [
      c.id,
      `"${c.name}"`,
      c.email,
      c.phone,
      c.gstin,
      c.city,
      c.country,
      c.ordersCount,
      c.totalInvoiced,
      c.outstandingReceivable,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clients_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Breadcrumb & Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/crm-dashboard" className="hover:text-primary transition-colors">CRM</Link>
            <span>/</span>
            <Link to="/client-dashboard" className="hover:text-primary transition-colors">Client Portal</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Clients</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Clients Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage corporate accounts, customer profiles, billing ledgers, and contact information.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
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
            Add New Client
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Clients</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{totalClients}</h3>
            <span className="text-xs text-muted-foreground">Registered accounts</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Accounts</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{activeClients}</h3>
            <span className="text-xs text-muted-foreground">With billable transactions</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Billed</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{formatSystemAmount(totalBilled)}</h3>
            <span className="text-xs text-muted-foreground">Lifetime volume</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Receivables (AR)</p>
            <h3 className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">{formatSystemAmount(totalOutstanding)}</h3>
            <span className="text-xs text-muted-foreground">Pending collections</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name, email, phone, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredClients.length}</span> of {totalClients} clients
          </div>
        </div>
      </div>

      {/* ── Table View ── */}
      {viewMode === "table" ? (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[100px]">Client ID</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Contact Information</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Total Invoiced</TableHead>
                <TableHead className="text-right">Outstanding (AR)</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Loading clients directory...
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                    <p className="text-sm font-medium">No clients found</p>
                    <p className="text-xs mt-1">Add your first client to start creating invoices and orders</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      #{client.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{client.name}</p>
                          {client.gstin && (
                            <p className="text-xs text-muted-foreground font-mono">
                              GSTIN: {client.gstin}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {client.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {!client.email && !client.phone && <span>—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{[client.city, client.country].filter(Boolean).join(", ") || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm text-foreground">
                      {formatSystemAmount(client.totalInvoiced)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {client.outstandingReceivable > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          {formatSystemAmount(client.outstandingReceivable)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Paid</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs font-mono">
                        {client.ordersCount}
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
                          <DropdownMenuItem onClick={() => openEdit(client)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Profile
                          </DropdownMenuItem>
                          <Link to="/invoices">
                            <DropdownMenuItem>
                              <Receipt className="h-4 w-4 mr-2" />
                              View Invoices
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem
                            onClick={() => setDeleteTargetId(client.id)}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Client
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
      ) : (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Loading clients...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card border rounded-xl">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
              <p className="text-sm font-medium">No clients found</p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-card border rounded-xl p-5 shadow-sm hover:shadow transition-shadow space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-foreground leading-tight">
                          {client.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          #{client.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(client)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTargetId(client.id)}
                          className="text-rose-600 focus:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-muted-foreground border-t pt-3">
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {(client.city || client.country) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{[client.city, client.country].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted/30 border rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Billed Volume</span>
                    <span className="font-semibold text-foreground text-sm">
                      {formatSystemAmount(client.totalInvoiced)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Outstanding</span>
                    <span
                      className={`font-semibold text-sm ${
                        client.outstandingReceivable > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {formatSystemAmount(client.outstandingReceivable)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={isAddOpen || !!editingClient}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingClient(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Edit Client Profile" : "Add New Client"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingClient ? handleUpdate : handleCreate} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Client / Company Name *</Label>
                <Input
                  placeholder="e.g. Acme Corporation or Jane Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="billing@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>GSTIN / Tax ID</Label>
                <Input
                  placeholder="Optional Tax / Registration code"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Credit Limit</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Billing Address</Label>
                <Input
                  placeholder="Street address, suite, floor..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input
                  placeholder="Country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes & Account Remarks</Label>
                <Textarea
                  placeholder="Internal notes or terms..."
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingClient(null);
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
                  : editingClient
                  ? "Update Client"
                  : "Create Client"}
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
            <DialogTitle className="text-center">Delete Client Profile</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this client? Any existing invoices will retain their historical records.
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
