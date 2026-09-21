import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_app/suppliers")({
  component: SuppliersPage,
});

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  city: string;
  country: string;
  purchasesCount: number;
  totalPurchasesAmount: number;
  createdAt: string;
  updatedAt: string;
}

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplierId, setViewingSupplierId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gstin: "",
    address: "",
    city: "",
    country: "India",
  });

  // 1. Fetch Suppliers
  const { data: suppliersRes, isLoading } = useQuery({
    queryKey: ["suppliers-list", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/suppliers?search=${encodeURIComponent(searchQuery)}` : "/api/suppliers";
      const res = await api.get<{ data: Supplier[] }>(url);
      return res.data || [];
    },
  });
  const suppliers: Supplier[] = suppliersRes || [];

  // 2. Fetch Single Supplier Details for Drawer
  const { data: supplierDetailRes } = useQuery({
    queryKey: ["supplier-detail", viewingSupplierId],
    queryFn: async () => {
      if (!viewingSupplierId) return null;
      const res = await api.get<{ data: any }>(`/api/suppliers/${viewingSupplierId}`);
      return res.data || null;
    },
    enabled: Boolean(viewingSupplierId),
  });
  const activeDetail = supplierDetailRes;

  // Create / Update Mutation
  const saveSupplierMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (editingSupplier) {
        const res = await api.put(`/api/suppliers/${editingSupplier.id}`, payload);
        return res.data;
      } else {
        const res = await api.post("/api/suppliers", payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingSupplier ? "Supplier updated successfully!" : "Supplier created successfully!");
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["suppliers-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to save supplier");
    },
  });

  // Delete Mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/suppliers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Supplier deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["suppliers-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to delete supplier");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      gstin: "",
      address: "",
      city: "",
      country: "India",
    });
    setEditingSupplier(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      email: sup.email || "",
      phone: sup.phone || "",
      gstin: sup.gstin || "",
      address: sup.address || "",
      city: sup.city || "",
      country: sup.country || "India",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    saveSupplierMutation.mutate(formData);
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const totalOrders = suppliers.reduce((acc, s) => acc + s.purchasesCount, 0);
    const totalSpend = suppliers.reduce((acc, s) => acc + s.totalPurchasesAmount, 0);
    const avgOrder = totalOrders > 0 ? totalSpend / totalOrders : 0;
    return { totalSuppliers, totalOrders, totalSpend, avgOrder };
  }, [suppliers]);

  return (
    <div className="w-full min-w-0 p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50 flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Suppliers & Vendors Master Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Maintain supplier contacts, GSTIN tax compliance, and track lifetime procurement volumes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleOpenCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" /> Add New Supplier
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Suppliers</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{metrics.totalSuppliers}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Purchase Orders</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{metrics.totalOrders}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Procurement Spend</p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">{formatSystemAmount(metrics.totalSpend)}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Order Volume</p>
              <h3 className="text-xl font-bold text-purple-600 mt-1">{formatSystemAmount(metrics.avgOrder)}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/70 shadow-xs">
        <CardHeader className="p-4 border-b border-border/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search supplier, email, GSTIN, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Showing {suppliers.length} registered vendors
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">Loading suppliers directory...</div>
          ) : suppliers.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Building2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No suppliers found.</p>
              <Button variant="outline" size="sm" onClick={handleOpenCreate}>
                Add Your First Supplier
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-xs">SUPPLIER / VENDOR</TableHead>
                    <TableHead className="font-semibold text-xs">CONTACT DETAILS</TableHead>
                    <TableHead className="font-semibold text-xs">GSTIN / TAX ID</TableHead>
                    <TableHead className="font-semibold text-xs">LOCATION</TableHead>
                    <TableHead className="font-semibold text-xs text-center">PURCHASE ORDERS</TableHead>
                    <TableHead className="font-semibold text-xs text-right">TOTAL SPENT</TableHead>
                    <TableHead className="font-semibold text-xs text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((sup) => (
                    <TableRow key={sup.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-md bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                            {sup.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 mb-0">{sup.name}</p>
                            <span className="text-[11px] text-muted-foreground">Vendor #{sup.id.slice(0, 6)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          {sup.email && (
                            <p className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-muted-foreground/70" /> {sup.email}
                            </p>
                          )}
                          {sup.phone && (
                            <p className="flex items-center gap-1.5 font-mono">
                              <Phone className="w-3 h-3 text-muted-foreground/70" /> {sup.phone}
                            </p>
                          )}
                          {!sup.email && !sup.phone && <span className="text-muted-foreground/50">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sup.gstin ? (
                          <Badge variant="outline" className="font-mono text-[11px] bg-slate-50 dark:bg-slate-900">
                            {sup.gstin}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">Unregistered</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground/70" />
                          <span>{sup.city ? `${sup.city}, ${sup.country}` : sup.country}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[11px]">
                          {sup.purchasesCount} Orders
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs text-emerald-600">
                        {formatSystemAmount(sup.totalPurchasesAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => setViewingSupplierId(sup.id)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleOpenEdit(sup)}
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete supplier "${sup.name}"?`)) {
                                deleteSupplierMutation.mutate(sup.id);
                              }
                            }}
                            disabled={deleteSupplierMutation.isPending || sup.purchasesCount > 0}
                            title={sup.purchasesCount > 0 ? "Cannot delete supplier with existing purchase orders" : "Delete supplier"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Supplier Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              {editingSupplier ? "Edit Supplier Record" : "Add New Supplier"}
            </DialogTitle>
            <DialogDescription>
              Enter vendor business credentials, tax GSTIN, and direct contact numbers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Supplier / Company Name *</Label>
              <Input
                required
                placeholder="e.g. Apex Global Distributors Pvt Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  placeholder="vendor@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">GSTIN / Tax ID</Label>
                <Input
                  placeholder="33AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  placeholder="e.g. Mumbai"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Street Address</Label>
              <Textarea
                placeholder="Vendor corporate or warehouse address..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveSupplierMutation.isPending}>
                {saveSupplierMutation.isPending ? "Saving..." : editingSupplier ? "Save Changes" : "Register Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Supplier Drawer / Modal */}
      <Dialog open={Boolean(viewingSupplierId)} onOpenChange={(open) => !open && setViewingSupplierId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> {activeDetail?.name}
            </DialogTitle>
            <DialogDescription>Vendor Profile & Recent Purchase Order Stream</DialogDescription>
          </DialogHeader>

          {activeDetail && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 text-xs">
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium mt-0.5">{activeDetail.email || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-mono mt-0.5">{activeDetail.phone || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">GSTIN / Tax:</span>
                  <p className="font-mono font-semibold mt-0.5">{activeDetail.gstin || "Unregistered"}</p>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-muted-foreground">Address:</span>
                  <p className="mt-0.5">{activeDetail.address ? `${activeDetail.address}, ${activeDetail.city || ""}, ${activeDetail.country}` : "—"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Purchase Orders History
                </h4>
                {activeDetail.purchases?.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-border/70 rounded-md">
                    No purchase orders recorded for this vendor yet.
                  </div>
                ) : (
                  <div className="border border-border/70 rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs font-semibold">PO #</TableHead>
                          <TableHead className="text-xs font-semibold">WAREHOUSE</TableHead>
                          <TableHead className="text-xs font-semibold">DATE</TableHead>
                          <TableHead className="text-xs font-semibold">STATUS</TableHead>
                          <TableHead className="text-xs font-semibold text-right">TOTAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeDetail.purchases?.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-xs font-semibold text-primary">{p.purchaseNo}</TableCell>
                            <TableCell className="text-xs">{p.warehouse?.name || "Main Warehouse"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(p.date).toLocaleDateString("en-IN")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-emerald-600">
                              {formatSystemAmount(Number(p.total))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
