'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useWorkspaceSettings } from "@/src/context/workspace-settings-context";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LifecycleDocumentField } from "@/components/hr/lifecycle-document-field";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  FileText,
  ExternalLink,
} from "lucide-react";

const EXPENSE_TYPES = [
  "Flight / Airfare",
  "Hotel / Accommodation",
  "Meals & Dining",
  "Local Transport / Taxi",
  "Fuel / Mileage",
  "Client Entertainment",
  "Conference / Registration",
  "Other",
];

const CURRENCIES = ["USD", "INR", "EUR", "GBP", "CAD", "AED", "SGD"];

function formatDateSafe(val?: string | null) {
  if (!val) return "—";
  try {
    return format(new Date(val), "yyyy-MM-dd");
  } catch {
    return String(val).slice(0, 10);
  }
}

function toInputDate(val?: string | null) {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

const emptyExpenseForm = {
  category: "",
  receiptDate: new Date().toISOString().split("T")[0],
  amount: "",
  currency: "INR",
  description: "",
  receiptUrl: "",
  receiptName: "",
  isReimbursable: true,
};

export default function TripExpensesPage() {
  const { formatCurrency } = useWorkspaceSettings();
  const params = useParams();
  const tripId = String(params?.id || "");
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [formData, setFormData] = useState(emptyExpenseForm);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data: trip, isLoading } = useQuery({
    queryKey: ["hr-lifecycle-trip-expenses", tripId],
    queryFn: async () => {
      const res = await api.get(`/hr/lifecycle/trips/${tripId}/expenses`);
      return res?.data || res;
    },
    enabled: !!tripId,
  });

  const expenses: any[] = trip?.expenses || [];

  const totals = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const reimbursable = expenses
      .filter((e) => e.isReimbursable !== false)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const advance = Number(trip?.advanceAmount || 0);
    return { total, reimbursable, advance };
  }, [expenses, trip]);

  const addMutation = useMutation({
    mutationFn: async (payload: any) => api.post(`/hr/lifecycle/trips/${tripId}/expenses`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trip-expenses", tripId] });
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Expense added to trip.");
      setIsModalOpen(false);
      setFormData(emptyExpenseForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to add expense.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ expenseId, payload }: { expenseId: string; payload: any }) =>
      api.put(`/hr/lifecycle/trips/${tripId}/expenses/${expenseId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trip-expenses", tripId] });
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Expense updated.");
      setIsModalOpen(false);
      setEditingExpense(null);
      setFormData(emptyExpenseForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update expense.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (expenseId: string) =>
      api.delete(`/hr/lifecycle/trips/${tripId}/expenses/${expenseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trip-expenses", tripId] });
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Expense removed.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete expense.");
    },
  });

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData(emptyExpenseForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: any) => {
    setEditingExpense(e);
    setFormData({
      category: e.category || "",
      receiptDate: toInputDate(e.receiptDate),
      amount: String(Number(e.amount || 0)),
      currency: e.currency || "INR",
      description: e.description || "",
      receiptUrl: e.receiptUrl || "",
      receiptName: e.receiptName || "",
      isReimbursable: e.isReimbursable !== false,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.category) {
      toast.error("Please select an expense type.");
      return;
    }
    if (!formData.receiptDate) {
      toast.error("Expense date is required.");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const payload = {
      ...formData,
      amount: Number(formData.amount),
    };

    if (editingExpense) {
      updateMutation.mutate({ expenseId: editingExpense.id, payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  const employeeName = trip?.employee
    ? `${trip.employee.firstName || ""} ${trip.employee.lastName || ""}`.trim()
    : "—";

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={`Trip Expenses${trip?.purpose ? ` - ${trip.purpose}` : ""}`}
        description="Manage trip expenses and receipts."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Employee Lifecycle", href: "/hr/lifecycle" },
          { label: "Trips", href: "/hr/lifecycle/trips" },
          { label: "Trip Expenses" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
              <Link href="/hr/lifecycle/trips">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </div>
        }
      />

      {/* Trip Details Card */}
      <Card className="border-border/80 rounded-xl shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Trip Details</CardTitle>
          <CardDescription className="text-xs">Information about the trip</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading trip details...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Employee</p>
                <p className="text-sm font-semibold text-foreground">{employeeName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Destination</p>
                <p className="text-sm font-semibold text-foreground">{trip?.destination || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Purpose</p>
                <p className="text-sm font-semibold text-foreground">{trip?.purpose || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                <p className="text-sm font-semibold text-foreground">{formatDateSafe(trip?.fromDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">End Date</p>
                <p className="text-sm font-semibold text-foreground">{formatDateSafe(trip?.toDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="text-sm font-semibold text-foreground capitalize">{trip?.status || "—"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Summary Card */}
      <Card className="border-border/80 rounded-xl shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Expense Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl p-4 bg-blue-500/5 border border-blue-500/15">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Expenses</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {formatCurrency(totals.total)}
              </p>
            </div>
            <div className="rounded-xl p-4 bg-emerald-500/5 border border-emerald-500/15">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Reimbursable</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {formatCurrency(totals.reimbursable)}
              </p>
            </div>
            <div className="rounded-xl p-4 bg-purple-500/5 border border-purple-500/15">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Advance Amount</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {formatCurrency(totals.advance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense List Card */}
      <Card className="border-border/80 rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Expense List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-12 text-[11px] uppercase tracking-wider text-muted-foreground">#</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Type</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Date</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Description</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Reimbursable</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      No results found.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((exp, idx) => (
                    <TableRow key={exp.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{exp.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateSafe(exp.receiptDate)}</TableCell>
                      <TableCell className="font-semibold text-sm">
                        {formatCurrency(Number(exp.amount || 0))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                        {exp.description || "—"}
                      </TableCell>
                      <TableCell>
                        {exp.isReimbursable !== false ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {exp.status || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {exp.receiptUrl && (
                            <a
                              href={exp.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                              title="View Receipt"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenEdit(exp)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(exp)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Expense Modal (Reference Screenshot 3) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Expense Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Expense Type" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Expense Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.receiptDate}
                onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 150.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Currency <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.currency}
                onValueChange={(val) => setFormData({ ...formData, currency: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Taxi fare from airport to hotel..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <LifecycleDocumentField
              label="Receipt *"
              folder="tenant/trip-receipts"
              documentUrl={formData.receiptUrl}
              documentName={formData.receiptName}
              onChange={(url, name) => setFormData({ ...formData, receiptUrl: url, receiptName: name })}
              placeholder="Select receipt file..."
            />

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="expense-reimbursable"
                checked={formData.isReimbursable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isReimbursable: Boolean(checked) })
                }
              />
              <Label htmlFor="expense-reimbursable" className="cursor-pointer font-medium">
                Reimbursable
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={addMutation.isPending || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {addMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Expense"
        description="Are you sure you want to delete this trip expense?"
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
