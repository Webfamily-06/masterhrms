import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Loader2,
  Eye,
  Printer,
  Send,
  Clock,
  Building2,
  Search,
  Download,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/invoices")({
  component: InvoicesPage,
  head: () => ({ meta: [{ title: "Sales Invoices — Master ERP" }] }),
});

// Types
export type InvoiceLine = {
  id: string;
  description: string;
  hsn_sac: string;
  qty: number;
  unit: string;
  rate: number;
  gst_rate: number;
  amount: number;
  gst_amount: number;
};

export type InvoiceRecord = {
  id: string;
  number: string;
  invoiceNo?: string;
  date: string;
  dueDate: string;
  client: string;
  client_gstin: string;
  clientGstin?: string;
  client_address: string;
  clientAddress?: string;
  client_email: string;
  clientEmail?: string;
  status: "draft" | "sent" | "paid" | "overdue";
  tax_mode: "sgst_cgst" | "igst";
  taxMode?: "sgst_cgst" | "igst";
  lines: InvoiceLine[];
  subtotal: number;
  total_gst: number;
  totalGst?: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  amount: number;
  notes: string;
  terms: string;
  paidAt?: string;
  created_at?: string;
};

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["pcs", "kg", "hr", "litre", "set", "box", "month", "year"];

let _invCounter = 900;

const EMPTY_LINE = (): InvoiceLine => ({
  id: `L-${Date.now()}-${Math.random()}`,
  description: "",
  hsn_sac: "",
  qty: 1,
  unit: "pcs",
  rate: 0,
  gst_rate: 18,
  amount: 0,
  gst_amount: 0,
});

function computeLine(line: InvoiceLine): InvoiceLine {
  const amount = Math.round(line.qty * line.rate * 100) / 100;
  const gst_amount = Math.round(amount * (line.gst_rate / 100) * 100) / 100;
  return { ...line, amount, gst_amount };
}

function fmt(n: number, currency?: any) {
  return formatSystemAmount(n, currency);
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-muted-foreground" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

function autoStatus(inv: InvoiceRecord): InvoiceRecord["status"] {
  if (inv.status === "paid") return "paid";
  if (inv.dueDate && new Date(inv.dueDate) < new Date()) return "overdue";
  return inv.status;
}

function InvoicesPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;

  const [builderOpen, setBuilderOpen] = useState(false);
  const [viewingInv, setViewingInv] = useState<InvoiceRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Builder form state
  const [bClient, setBClient] = useState("");
  const [bGstin, setBGstin] = useState("");
  const [bAddress, setBAddress] = useState("");
  const [bEmail, setBEmail] = useState("");
  const [bDueDate, setBDueDate] = useState("");
  const [bTaxMode, setBTaxMode] = useState<"sgst_cgst" | "igst">("sgst_cgst");
  const [bLines, setBLines] = useState<InvoiceLine[]>([EMPTY_LINE()]);
  const [bNotes, setBNotes] = useState("");
  const [bTerms, setBTerms] = useState("Payment due within 15 days of invoice date.");

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["realtime-tenant-invoices", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/invoices");
        return Array.isArray(res) ? (res as InvoiceRecord[]) : [];
      } catch {
        return [] as InvoiceRecord[];
      }
    },
  });

  // Auto-refresh overdue statuses
  const invoicesWithStatus = useMemo(() =>
    invoices.map((inv) => ({ ...inv, status: autoStatus(inv) })),
    [invoices]
  );

  const persistMut = useMutation({
    mutationFn: async (list: InvoiceRecord[]) => {
      if (list.length > 0) {
        await api.post("/invoices", list[0]);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["realtime-tenant-invoices", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Computed builder totals
  const computedLines = bLines.map(computeLine);
  const bSubtotal = computedLines.reduce((s, l) => s + l.amount, 0);
  const bTotalGst = computedLines.reduce((s, l) => s + l.gst_amount, 0);
  const bCgst = bTaxMode === "sgst_cgst" ? Math.round(bTotalGst / 2) : 0;
  const bSgst = bTaxMode === "sgst_cgst" ? Math.round(bTotalGst / 2) : 0;
  const bIgst = bTaxMode === "igst" ? Math.round(bTotalGst) : 0;
  const bTotal = Math.round(bSubtotal + bTotalGst);

  function updateLine(id: string, field: keyof InvoiceLine, value: any) {
    setBLines((prev) => prev.map((l) => l.id === id ? { ...l, [field]: field === "qty" || field === "rate" || field === "gst_rate" ? Number(value) : value } : l));
  }

  function removeLine(id: string) {
    if (bLines.length === 1) return;
    setBLines((prev) => prev.filter((l) => l.id !== id));
  }

  function resetBuilder() {
    setBClient(""); setBGstin(""); setBAddress(""); setBEmail(""); setBDueDate("");
    setBTaxMode("sgst_cgst"); setBLines([EMPTY_LINE()]); setBNotes("");
    setBTerms("Payment due within 15 days of invoice date.");
  }

  function handleCreate() {
    if (!bClient.trim()) return toast.error("Client name is required");
    if (computedLines.every((l) => !l.description.trim())) return toast.error("Add at least one line item");
    _invCounter++;
    const year = new Date().getFullYear();
    const newInv: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      number: `INV-${year}-${_invCounter}`,
      client: bClient,
      client_gstin: bGstin,
      client_address: bAddress,
      client_email: bEmail,
      lines: computedLines.filter((l) => l.description.trim()),
      subtotal: bSubtotal,
      total_gst: bTotalGst,
      cgst: bCgst,
      sgst: bSgst,
      igst: bIgst,
      tax_mode: bTaxMode,
      total: bTotal,
      amount: bTotal,
      date: new Date().toISOString().slice(0, 10),
      dueDate: bDueDate || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      status: "draft",
      notes: bNotes,
      terms: bTerms,
      created_at: new Date().toISOString(),
    };
    persistMut.mutate([newInv, ...invoices]);
    toast.success(`Invoice ${newInv.number} created!`);
    setBuilderOpen(false);
    resetBuilder();
  }

  function markPaid(id: string) {
    persistMut.mutate(invoices.map((i) => (i.id === id ? { ...i, status: "paid" as const } : i)));
    toast.success("Invoice marked as paid!");
  }

  function markSent(id: string) {
    persistMut.mutate(invoices.map((i) => (i.id === id ? { ...i, status: "sent" as const } : i)));
    toast.success("Invoice marked as sent!");
  }

  function deleteInvoice(id: string) {
    if (!confirm("Delete this invoice?")) return;
    persistMut.mutate(invoices.filter((i) => i.id !== id));
    toast.success("Invoice deleted.");
  }

  const filtered = invoicesWithStatus.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch = !q || inv.number.toLowerCase().includes(q) || inv.client.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalInvoiced = invoicesWithStatus.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoicesWithStatus.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalPending = invoicesWithStatus.filter((i) => i.status === "sent" || i.status === "draft").reduce((s, i) => s + i.total, 0);
  const overdueCount = invoicesWithStatus.filter((i) => i.status === "overdue").length;

  return (
    <PlanGuard moduleName="Sales Invoices & Billing" requiredPlan="free">
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Receipt className="size-6 text-primary" /> Sales Invoices & Billing
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              GST-compliant invoices with multi-line items, CGST/SGST/IGST breakdown and PDF export.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PlanLimitBar used={invoices.length} limit={500} label="Invoice Quota" />
            <Button onClick={() => { resetBuilder(); setBuilderOpen(true); }} className="gap-2 font-bold">
              <Plus className="size-4" /> New Invoice
            </Button>
          </div>
        </div>

        {/* Overdue Alert */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="size-4 shrink-0" />
            <strong>{overdueCount} invoice{overdueCount > 1 ? "s are" : " is"} overdue!</strong>
            <span className="text-red-500">Follow up with clients to collect payment.</span>
          </div>
        )}

        {/* Sneat Pro Invoice KPI Summary Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Total Invoiced", value: fmt(totalInvoiced, sysConfig?.currency), desc: `All ${invoices.length} invoices generated`, icon: Receipt, color: "text-primary bg-primary/10" },
            { title: "Collected (Paid)", value: fmt(totalPaid, sysConfig?.currency), desc: "Direct client settlements", icon: CheckCircle2, color: "text-[oklch(0.60_0.17_155)] bg-[oklch(0.60_0.17_155/0.10)]" },
            { title: "Outstanding", value: fmt(totalPending, sysConfig?.currency), desc: "Pending client payment", icon: Clock, color: "text-[oklch(0.73_0.16_75)] bg-[oklch(0.73_0.16_75/0.10)]" },
            { title: "Total Invoices", value: `${invoices.length} Invoices`, desc: "Lifetime invoices created", icon: DollarSign, color: "text-[oklch(0.60_0.20_200)] bg-[oklch(0.60_0.20_200/0.10)]" },
          ].map((m) => (
            <Card key={m.title} className="border border-border/70 shadow-xs">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">{m.title}</span>
                  <h4 className="text-xl font-bold tracking-tight text-foreground">{m.value}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono">{m.desc}</p>
                </div>
                <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", m.color)}>
                  <m.icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice # or client..." className="pl-9 text-xs h-9" />
          </div>
          <div className="flex items-center gap-2">
            {["all", "draft", "sent", "paid", "overdue"].map((s) => {
              const count = s === "all" ? invoicesWithStatus.length : invoicesWithStatus.filter((i) => i.status === s).length;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead className="text-xs">Invoice #</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Due Date</TableHead>
                  <TableHead className="text-xs">Items</TableHead>
                  <TableHead className="text-xs">GST</TableHead>
                  <TableHead className="text-xs">Total</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground italic">
                      <Receipt className="size-8 mx-auto opacity-20 mb-2" />
                      No invoices found. Create your first invoice!
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-secondary/20">
                      <TableCell className="font-mono font-bold text-primary text-xs">{inv.number || inv.id}</TableCell>
                      <TableCell>
                        <div className="font-bold text-xs">{inv.client}</div>
                        {inv.client_gstin && <div className="text-[10px] text-muted-foreground font-mono">{inv.client_gstin}</div>}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{inv.date}</TableCell>
                      <TableCell className="text-xs font-mono">{inv.dueDate}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.lines?.length ?? "—"} items</TableCell>
                      <TableCell className="text-xs font-mono text-indigo-600">{fmt(inv.total_gst || 0, sysConfig?.currency)}</TableCell>
                      <TableCell className="font-mono font-bold text-sm">{fmt(inv.total || inv.amount, sysConfig?.currency)}</TableCell>
                      <TableCell>
                        <Badge className={`font-bold text-[10px] border-0 ${STATUS_STYLE[inv.status]?.className}`}>
                          {STATUS_STYLE[inv.status]?.label ?? inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="size-7" title="View" onClick={() => setViewingInv(inv)}><Eye className="size-3.5" /></Button>
                          {inv.status === "draft" && (
                            <Button size="icon" variant="ghost" className="size-7 text-blue-600" title="Mark Sent" onClick={() => markSent(inv.id)}><Send className="size-3.5" /></Button>
                          )}
                          {inv.status !== "paid" && (
                            <Button size="icon" variant="ghost" className="size-7 text-emerald-600" title="Mark Paid" onClick={() => markPaid(inv.id)}><CheckCircle2 className="size-3.5" /></Button>
                          )}
                          <Button size="icon" variant="ghost" className="size-7 text-destructive" title="Delete" onClick={() => deleteInvoice(inv.id)}><Trash2 className="size-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ===== MODAL: INVOICE BUILDER ===== */}
        <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Receipt className="size-5 text-primary" /> New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-xs">
              {/* Client Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Client Name *</Label>
                  <Input value={bClient} onChange={(e) => setBClient(e.target.value)} placeholder="Apex Global Ltd" className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Client GSTIN</Label>
                  <Input value={bGstin} onChange={(e) => setBGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" className="text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Client Email</Label>
                  <Input value={bEmail} onChange={(e) => setBEmail(e.target.value)} placeholder="billing@client.com" className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Due Date</Label>
                  <Input type="date" value={bDueDate} onChange={(e) => setBDueDate(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-semibold">Client Address</Label>
                  <Input value={bAddress} onChange={(e) => setBAddress(e.target.value)} placeholder="123, Business Park, Mumbai - 400001" className="text-xs" />
                </div>
              </div>

              {/* Tax Mode */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border">
                <span className="font-semibold">Tax Mode:</span>
                <div className="flex items-center gap-2">
                  {(["sgst_cgst", "igst"] as const).map((m) => (
                    <button key={m} onClick={() => setBTaxMode(m)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${bTaxMode === m ? "bg-indigo-600 text-white border-indigo-600" : "border-border hover:border-indigo-400"}`}>
                      {m === "sgst_cgst" ? "CGST + SGST (Intrastate)" : "IGST (Interstate)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold">Line Items</Label>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => setBLines([...bLines, EMPTY_LINE()])}>
                    <Plus className="size-3.5" /> Add Line
                  </Button>
                </div>
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/50">
                      <tr>
                        {["Description", "HSN/SAC", "Qty", "Unit", "Rate (₹)", "GST %", "Amount", "GST Amt", ""].map((h) => (
                          <th key={h} className="p-2 text-left font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bLines.map((line) => {
                        const cl = computeLine(line);
                        return (
                          <tr key={line.id} className="border-t">
                            <td className="p-1.5"><Input value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)} placeholder="Description..." className="text-xs h-7 min-w-[120px]" /></td>
                            <td className="p-1.5"><Input value={line.hsn_sac} onChange={(e) => updateLine(line.id, "hsn_sac", e.target.value)} placeholder="998314" className="text-xs h-7 font-mono w-20" /></td>
                            <td className="p-1.5"><Input type="number" value={line.qty} onChange={(e) => updateLine(line.id, "qty", e.target.value)} className="text-xs h-7 w-14 font-mono" /></td>
                            <td className="p-1.5">
                              <Select value={line.unit} onValueChange={(v) => updateLine(line.id, "unit", v)}>
                                <SelectTrigger className="text-xs h-7 w-16"><SelectValue /></SelectTrigger>
                                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                              </Select>
                            </td>
                            <td className="p-1.5"><Input type="number" value={line.rate} onChange={(e) => updateLine(line.id, "rate", e.target.value)} className="text-xs h-7 font-mono w-24" /></td>
                            <td className="p-1.5">
                              <Select value={String(line.gst_rate)} onValueChange={(v) => updateLine(line.id, "gst_rate", v)}>
                                <SelectTrigger className="text-xs h-7 w-16"><SelectValue /></SelectTrigger>
                                <SelectContent>{GST_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                              </Select>
                            </td>
                            <td className="p-1.5 font-mono font-bold text-right">{fmt(cl.amount, sysConfig?.currency)}</td>
                            <td className="p-1.5 font-mono text-indigo-600 text-right">+{fmt(cl.gst_amount, sysConfig?.currency)}</td>
                            <td className="p-1.5">
                              <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => removeLine(line.id)}><Trash2 className="size-3" /></Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 p-3 rounded-xl bg-secondary/30 border text-xs">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="font-mono">{fmt(bSubtotal, sysConfig?.currency)}</span></div>
                  {bTaxMode === "sgst_cgst" ? (
                    <>
                      <div className="flex justify-between text-muted-foreground"><span>CGST</span><span className="font-mono">+{fmt(bCgst, sysConfig?.currency)}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>SGST</span><span className="font-mono">+{fmt(bSgst, sysConfig?.currency)}</span></div>
                    </>
                  ) : (
                    <div className="flex justify-between text-muted-foreground"><span>IGST</span><span className="font-mono">+{fmt(bIgst, sysConfig?.currency)}</span></div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-extrabold text-base"><span>Total</span><span className="font-mono text-primary">{fmt(bTotal, sysConfig?.currency)}</span></div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Notes</Label>
                  <Textarea value={bNotes} onChange={(e) => setBNotes(e.target.value)} rows={3} placeholder="Thank you for your business..." className="text-xs resize-none" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Terms & Conditions</Label>
                  <Textarea value={bTerms} onChange={(e) => setBTerms(e.target.value)} rows={3} className="text-xs resize-none" />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setBuilderOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={persistMut.isPending || !bClient.trim()} className="font-bold gap-2">
                {persistMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Receipt className="size-4" />}
                Create Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== MODAL: VIEW / PRINT INVOICE ===== */}
        {viewingInv && (
          <Dialog open={!!viewingInv} onOpenChange={(o) => !o && setViewingInv(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Printer className="size-5 text-primary" /> Invoice — {viewingInv.number || viewingInv.id}
                </DialogTitle>
              </DialogHeader>
              <div id="invoice-print" className="space-y-4 text-xs">
                {/* Company Header */}
                <div className="flex items-start justify-between p-5 rounded-xl bg-gradient-to-r from-primary/10 to-indigo-500/10 border">
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-xl bg-primary grid place-items-center shrink-0">
                      <Building2 className="size-7 text-white" />
                    </div>
                    <div>
                      <div className="font-black text-xl">{sysConfig?.appName || "Master ERP"}</div>
                      {sysConfig?.address && <div className="text-muted-foreground text-xs">{sysConfig.address}</div>}
                      {sysConfig?.email && <div className="text-muted-foreground text-xs">{sysConfig.email}</div>}
                      {sysConfig?.gstin && <div className="text-xs font-mono">GSTIN: <strong>{sysConfig.gstin}</strong></div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xl text-primary">TAX INVOICE</div>
                    <div className="font-mono text-muted-foreground text-xs mt-1">#{viewingInv.number || viewingInv.id}</div>
                    <div className="text-xs mt-1">Date: <strong>{viewingInv.date}</strong></div>
                    <div className="text-xs">Due: <strong>{viewingInv.dueDate}</strong></div>
                    <Badge className={`mt-2 font-bold text-[10px] border-0 ${STATUS_STYLE[viewingInv.status]?.className}`}>
                      {STATUS_STYLE[viewingInv.status]?.label}
                    </Badge>
                  </div>
                </div>

                {/* Bill To */}
                <div className="p-4 border rounded-xl">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">Bill To</div>
                  <div className="font-bold text-sm">{viewingInv.client}</div>
                  {viewingInv.client_gstin && <div className="font-mono text-xs text-muted-foreground">GSTIN: {viewingInv.client_gstin}</div>}
                  {viewingInv.client_email && <div className="text-xs text-muted-foreground">{viewingInv.client_email}</div>}
                  {viewingInv.client_address && <div className="text-xs text-muted-foreground mt-1">{viewingInv.client_address}</div>}
                </div>

                {/* Line Items Table */}
                {viewingInv.lines && viewingInv.lines.length > 0 && (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/50">
                        <tr>{["#", "Description", "HSN/SAC", "Qty", "Rate", "GST %", "GST Amt", "Total"].map((h) => (
                          <th key={h} className="p-2.5 text-left font-semibold">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {viewingInv.lines.map((line, idx) => (
                          <tr key={line.id || idx} className="border-t">
                            <td className="p-2.5 text-muted-foreground">{idx + 1}</td>
                            <td className="p-2.5 font-semibold">{line.description}</td>
                            <td className="p-2.5 font-mono text-muted-foreground">{line.hsn_sac || "—"}</td>
                            <td className="p-2.5 font-mono">{line.qty} {line.unit}</td>
                            <td className="p-2.5 font-mono">{fmt(line.rate, sysConfig?.currency)}</td>
                            <td className="p-2.5">
                              <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-[9px]">{line.gst_rate}%</Badge>
                            </td>
                            <td className="p-2.5 font-mono text-indigo-600">+{fmt(line.gst_amount, sysConfig?.currency)}</td>
                            <td className="p-2.5 font-mono font-bold">{fmt(line.amount + line.gst_amount, sysConfig?.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* GST Summary & Totals */}
                <div className="flex gap-4">
                  {/* GST Breakup */}
                  <div className="flex-1 border rounded-xl overflow-hidden">
                    <div className="p-3 bg-secondary/30 border-b">
                      <div className="font-bold text-[10px] uppercase tracking-wider">GST Summary</div>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/20"><tr><th className="p-2 text-left">HSN/SAC</th><th className="p-2 text-right">Taxable</th><th className="p-2 text-right">{viewingInv.tax_mode === "igst" ? "IGST" : "CGST"}</th>{viewingInv.tax_mode !== "igst" && <th className="p-2 text-right">SGST</th>}</tr></thead>
                      <tbody>
                        {viewingInv.lines?.map((line, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-mono">{line.hsn_sac || "—"}</td>
                            <td className="p-2 text-right font-mono">{fmt(line.amount, sysConfig?.currency)}</td>
                            <td className="p-2 text-right font-mono text-indigo-600">
                              {viewingInv.tax_mode === "igst" ? fmt(line.gst_amount, sysConfig?.currency) : fmt(Math.round(line.gst_amount / 2), sysConfig?.currency)}
                            </td>
                            {viewingInv.tax_mode !== "igst" && <td className="p-2 text-right font-mono text-indigo-600">{fmt(Math.round(line.gst_amount / 2), sysConfig?.currency)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Amount Summary */}
                  <div className="w-64 space-y-2 p-4 border rounded-xl bg-secondary/10">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{fmt(viewingInv.subtotal || viewingInv.amount, sysConfig?.currency)}</span></div>
                    {viewingInv.tax_mode === "sgst_cgst" ? (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="font-mono">+{fmt(viewingInv.cgst || 0, sysConfig?.currency)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="font-mono">+{fmt(viewingInv.sgst || 0, sysConfig?.currency)}</span></div>
                      </>
                    ) : (
                      <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="font-mono">+{fmt(viewingInv.igst || viewingInv.total_gst || 0, sysConfig?.currency)}</span></div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-extrabold text-lg">
                      <span>Total</span>
                      <span className="font-mono text-primary">{fmt(viewingInv.total || viewingInv.amount, sysConfig?.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Terms & Notes */}
                {(viewingInv.terms || viewingInv.notes) && (
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-xl bg-secondary/10 text-[10px]">
                    {viewingInv.terms && <div><div className="font-bold mb-1 uppercase tracking-wider text-muted-foreground">Terms</div><div>{viewingInv.terms}</div></div>}
                    {viewingInv.notes && <div><div className="font-bold mb-1 uppercase tracking-wider text-muted-foreground">Notes</div><div>{viewingInv.notes}</div></div>}
                  </div>
                )}
                <div className="text-center text-[10px] text-muted-foreground pt-2">This is a computer-generated invoice and does not require a signature.</div>
              </div>
              <DialogFooter className="mt-4 gap-2">
                <Button variant="outline" onClick={() => setViewingInv(null)}>Close</Button>
                <Button className="gap-2 font-bold" onClick={() => { window.print(); toast.success("Opening print dialog..."); }}>
                  <Printer className="size-4" /> Print / Download PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PlanGuard>
  );
}
