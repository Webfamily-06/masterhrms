import { createFileRoute, Link, useNavigate, Outlet, useMatches } from "@tanstack/react-router";
import { useState, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
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
import {
  Printer,
  Download,
  ArrowLeft,
  CreditCard,
  Building2,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Copy,
  Receipt,
  QrCode,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/invoice/$id")({
  component: InvoiceDetailPage,
  head: () => ({ meta: [{ title: "Invoice Details — Master ERP" }] }),
});

export type InvoiceLine = {
  id?: string;
  description: string;
  hsn_sac?: string;
  qty: number;
  unit?: string;
  rate: number;
  gst_rate?: number;
  amount: number;
  gst_amount?: number;
};

export type InvoicePayment = {
  id: string;
  amount: number;
  method: string;
  referenceNo?: string;
  notes?: string;
  paidAt: string;
};

export type InvoiceDetail = {
  id: string;
  number: string;
  invoiceNo?: string;
  date: string;
  dueDate: string;
  client: string;
  client_gstin?: string;
  clientGstin?: string;
  client_address?: string;
  clientAddress?: string;
  client_email?: string;
  clientEmail?: string;
  client_phone?: string;
  status: "draft" | "sent" | "paid" | "partial" | "overdue";
  paymentStatus?: string;
  tax_mode?: "sgst_cgst" | "igst";
  taxMode?: "sgst_cgst" | "igst";
  subtotal: number;
  total_gst?: number;
  totalGst?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total: number;
  amount?: number;
  paidAmount?: number;
  remainingBalance?: number;
  notes?: string;
  terms?: string;
  created_at?: string;
  lines: InvoiceLine[];
  payments?: InvoicePayment[];
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  sent: { label: "Sent / Pending", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  partial: { label: "Partially Paid", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  paid: { label: "Paid in Full", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  overdue: { label: "Overdue", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
};

function numberToWords(num: number): string {
  if (isNaN(num) || num <= 0) return "Zero Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertInteger(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + " " + ones[n % 10] + " ";
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + convertInteger(n % 100);
    if (n < 100000) return convertInteger(Math.floor(n / 1000)) + " Thousand " + convertInteger(n % 1000);
    if (n < 10000000) return convertInteger(Math.floor(n / 100000)) + " Lakh " + convertInteger(n % 100000);
    return convertInteger(Math.floor(n / 10000000)) + " Crore " + convertInteger(n % 10000000);
  }

  const intPart = Math.floor(num);
  const words = convertInteger(intPart).trim();
  return words ? `${words} Only` : "Zero Only";
}

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const matches = useMatches();
  const isPrintChild = matches.some((m) => m.routeId.endsWith("/print"));
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);

  // System currency configuration
  const { data: sysConfig } = useQuery<{ currency?: string; timezone?: string }>({
    queryKey: ["sys-config", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get<{ currency?: string }>("/settings/system");
        return res || { currency: "INR" };
      } catch {
        return { currency: "INR" };
      }
    },
    staleTime: 60_000,
  });

  // Fetch Authoritative Company Profile & Primary GST Registration (Phase 2 Wave 2.1)
  const { data: companyData } = useQuery<{ profile?: any; primaryGst?: any }>({
    queryKey: ["company-profile", "current"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/company-profile");
        return res.data || res;
      } catch {
        return {};
      }
    },
    staleTime: 60_000,
  });

  const fmt = (n: number) =>
    formatSystemAmount(n, sysConfig?.currency ? { defaultCurrency: sysConfig.currency } : undefined);

  // Query single invoice details
  const {
    data: invoice,
    isLoading,
    error,
    refetch,
  } = useQuery<InvoiceDetail>({
    queryKey: ["invoice-detail", id, tenantId],
    queryFn: async () => {
      const res = await api.get<InvoiceDetail>(`/invoices/${id}`);
      return res;
    },
    enabled: !!id,
    retry: 1,
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (payload: {
      amount: number;
      method: string;
      referenceNo: string;
      notes: string;
      date: string;
      idempotencyKey: string;
    }) => {
      return await api.post(`/invoices/${id}/payments`, payload);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Payment recorded successfully.");
      setPaymentModalOpen(false);
      qc.invalidateQueries({ queryKey: ["invoice-detail", id] });
      qc.invalidateQueries({ queryKey: ["invoices", tenantId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || "Failed to record payment.";
      toast.error(msg);
    },
  });

  const handleOpenPayment = () => {
    if (!invoice) return;
    const balance = invoice.remainingBalance ?? Math.max(0, Number(invoice.total || 0) - Number(invoice.paidAmount || 0));
    setPayAmount(String(balance > 0 ? balance : ""));
    setPayRef(`TXN-${Date.now().toString().slice(-6)}`);
    setPayNotes(`Payment for ${invoice.number || invoice.invoiceNo}`);
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount greater than zero.");
      return;
    }
    const balance = invoice?.remainingBalance ?? Math.max(0, Number(invoice?.total || 0) - Number(invoice?.paidAmount || 0));
    if (amt > balance + 0.01) {
      toast.error(`Payment amount cannot exceed remaining balance of ${fmt(balance)}`);
      return;
    }

    recordPaymentMutation.mutate({
      amount: amt,
      method: payMethod,
      referenceNo: payRef,
      notes: payNotes,
      date: payDate,
      idempotencyKey: `pay-${invoice?.id}-${Date.now()}`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const portalUrl = `${window.location.origin}/portal/invoices/${invoice?.number || invoice?.invoiceNo || id}`;
    navigator.clipboard.writeText(portalUrl);
    toast.success("B2B Client Portal link copied to clipboard!");
  };

  if (isPrintChild) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-muted rounded"></div>
          <div className="h-9 w-28 bg-muted rounded"></div>
        </div>
        <Card className="p-8">
          <div className="space-y-4">
            <div className="h-10 w-48 bg-muted rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
            </div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-4">
          <Link
            to="/invoices"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3.5" /> Back to Invoices
          </Link>
        </div>
        <Card className="border-destructive/40 shadow-sm text-center py-12 px-6">
          <AlertCircle className="size-12 text-destructive mx-auto mb-3 opacity-90" />
          <CardTitle className="text-lg font-bold text-foreground">Invoice Not Found</CardTitle>
          <CardDescription className="text-sm mt-1 max-w-md mx-auto">
            The requested invoice (ID: <code className="font-mono text-xs">{id}</code>) does not exist, belongs to another workspace, or you do not have permission to view it.
          </CardDescription>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/invoices" })}>
              Return to Invoices List
            </Button>
            <Button size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const invoiceNo = invoice.number || invoice.invoiceNo || invoice.id;
  const totalAmount = Number(invoice.total || invoice.amount || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const remainingBalance = invoice.remainingBalance ?? Math.max(0, totalAmount - paidAmount);
  const statusKey = invoice.status || (remainingBalance <= 0 ? "paid" : paidAmount > 0 ? "partial" : "sent");
  const badgeInfo = STATUS_BADGE[statusKey] || STATUS_BADGE.sent;
  const isPaid = statusKey === "paid" || remainingBalance <= 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* ===== TOP NAVIGATION & ACTION BAR (HIDDEN IN PRINT) ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/invoices" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="size-3.5" /> Invoices
            </Link>
            <span>/</span>
            <span className="font-mono text-foreground">{invoiceNo}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Invoice <span className="font-mono text-primary">#{invoiceNo}</span>
            <Badge className={cn("text-xs font-semibold px-2 py-0.5 border-0", badgeInfo.className)}>
              {badgeInfo.label}
            </Badge>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {!isPaid && (
            <Button
              size="sm"
              onClick={handleOpenPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
            >
              <DollarSign className="size-4 mr-1.5" /> Record Payment
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            title="Copy Client B2B Portal Link"
            className="text-xs"
          >
            <ExternalLink className="size-3.5 mr-1.5 text-muted-foreground" /> B2B Link
          </Button>

          <Link to="/invoice/$id/print" params={{ id }}>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Printer className="size-3.5 mr-1.5 text-muted-foreground" /> Dedicated Print View
            </Button>
          </Link>

          <Link to="/invoices">
            <Button size="sm" variant="ghost" className="text-xs">
              Back to List
            </Button>
          </Link>
        </div>
      </div>

      {/* ===== PRINTABLE INVOICE SHEET (MATCHING ui-2/invoice-details.html) ===== */}
      <Card
        id="printable-invoice"
        className="bg-card shadow-sm border border-border overflow-hidden print:border-0 print:shadow-none print:m-0 print:p-0"
      >
        <CardContent className="p-6 sm:p-10 space-y-8">
          {/* Header Row: Company Brand + Invoice Meta */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-border pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                  ERP
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground leading-none">
                    {profile?.tenant?.name || "Master HRMS & ERP"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Enterprise Global SaaS Operations</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm">
                Corporate Headquarters &bull; Technology Park &bull; Global Operations
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 sm:self-start">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice Reference</h4>
              <p className="font-mono text-xl font-black text-primary">#{invoiceNo}</p>
              <div className="text-xs space-y-0.5 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Issue Date:</span>{" "}
                  {invoice.date ? new Date(invoice.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Due Date:</span>{" "}
                  {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Parties: Billed From vs Billed To + Payment Status Box */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border-b border-border pb-6">
            {/* From */}
            <div className="md:col-span-5 space-y-1 text-xs">
              <p className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">Billed By (From)</p>
              <h4 className="font-bold text-sm text-foreground">{companyData?.profile?.legalName || profile?.tenant?.name || "Global Cloud Systems"}</h4>
              <p className="text-muted-foreground">{companyData?.profile?.registeredAddress || "Finance & Commercial Billing Operations"}</p>
              <p className="text-muted-foreground">Email: {companyData?.profile?.email || "billing@enterprise-erp.com"}</p>
              {companyData?.profile?.phone && <p className="text-muted-foreground">Phone: {companyData.profile.phone}</p>}
              {companyData?.primaryGst?.gstin ? (
                <p className="text-muted-foreground font-mono">GSTIN: {companyData.primaryGst.gstin}</p>
              ) : companyData?.profile?.pan ? (
                <p className="text-muted-foreground font-mono">PAN: {companyData.profile.pan}</p>
              ) : null}
            </div>

            {/* To */}
            <div className="md:col-span-5 space-y-1 text-xs">
              <p className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">Billed To (Client)</p>
              <h4 className="font-bold text-sm text-foreground">{invoice.client || "Client Account"}</h4>
              <p className="text-muted-foreground">{invoice.client_address || invoice.clientAddress || "Corporate Office Address"}</p>
              {(invoice.client_email || invoice.clientEmail) && (
                <p className="text-muted-foreground">Email: {invoice.client_email || invoice.clientEmail}</p>
              )}
              {invoice.client_phone && <p className="text-muted-foreground">Phone: {invoice.client_phone}</p>}
              {(invoice.client_gstin || invoice.clientGstin) && (
                <p className="text-muted-foreground font-mono">GSTIN: {invoice.client_gstin || invoice.clientGstin}</p>
              )}
            </div>

            {/* Status Stamp & Verification QR */}
            <div className="md:col-span-2 flex flex-col items-start md:items-end justify-between">
              <div className="space-y-1 md:text-right">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Payment Status
                </span>
                <Badge className={cn("text-xs font-bold px-2 py-0.5 border-0", badgeInfo.className)}>
                  {badgeInfo.label}
                </Badge>
              </div>

              {/* Dynamic QR Code representation */}
              <div className="mt-3 md:mt-0 p-2 bg-white dark:bg-slate-900 border rounded-lg inline-flex flex-col items-center shadow-xs">
                <QrCode className="size-14 text-slate-800 dark:text-slate-200" />
                <span className="text-[9px] text-muted-foreground font-mono mt-0.5">Scan to Verify</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoice Line Items</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/40">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">#</TableHead>
                    <TableHead className="text-xs font-semibold">Description / Product</TableHead>
                    <TableHead className="text-xs font-semibold text-center w-24">HSN / SAC</TableHead>
                    <TableHead className="text-xs font-semibold text-right w-20">Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-right w-28">Unit Rate</TableHead>
                    <TableHead className="text-xs font-semibold text-right w-24">GST Rate</TableHead>
                    <TableHead className="text-xs font-semibold text-right w-32">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!invoice.lines || invoice.lines.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                        Standard Service Invoice (1 Lumsum Item)
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoice.lines.map((line, idx) => (
                      <TableRow key={line.id || idx} className="text-xs">
                        <TableCell className="text-center font-mono text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{line.description}</div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground text-[11px]">
                          {line.hsn_sac || "998313"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {line.qty} {line.unit || "Pcs"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmt(line.rate)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-indigo-600">
                          {line.gst_rate !== undefined ? `${line.gst_rate}%` : "18%"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {fmt(line.amount || line.qty * line.rate)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Lower Section: Terms & Notes + Financial Calculation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border-b border-border pb-6">
            {/* Left: Notes & Bank Remittance Instructions */}
            <div className="md:col-span-7 space-y-4 text-xs">
              <div className="space-y-1">
                <h5 className="font-bold text-foreground">Terms and Conditions</h5>
                <p className="text-muted-foreground leading-relaxed">
                  {invoice.terms ||
                    "Payment is strictly due within standard credit terms. Delayed remittances may attract statutory interest @ 14% p.a. Please quote the invoice reference number when releasing electronic wire payments."}
                </p>
              </div>

              {invoice.notes && (
                <div className="space-y-1">
                  <h5 className="font-bold text-foreground">Special Instructions / Notes</h5>
                  <p className="text-muted-foreground leading-relaxed">{invoice.notes}</p>
                </div>
              )}

              {/* Remittance Bank Information */}
              <div className="p-3 bg-secondary/30 rounded-lg border text-xs space-y-1.5">
                <span className="font-bold text-foreground block">Electronic Remittance Details</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Bank:</span> HDFC Commercial Banking
                  </div>
                  <div>
                    <span className="font-medium text-foreground">A/C No:</span> 50200084729104
                  </div>
                  <div>
                    <span className="font-medium text-foreground">IFSC:</span> HDFC0001234
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Branch:</span> Indiranagar, Bengaluru
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Totals Breakdown */}
            <div className="md:col-span-5 space-y-2 text-xs">
              <div className="space-y-1.5 bg-secondary/20 p-4 rounded-lg border">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Sub Total</span>
                  <span className="font-mono font-medium text-foreground">
                    {fmt(invoice.subtotal || 0)}
                  </span>
                </div>

                {invoice.tax_mode === "igst" || invoice.taxMode === "igst" ? (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>IGST (Integrated Tax)</span>
                    <span className="font-mono font-medium text-indigo-600">
                      {fmt(invoice.igst || invoice.total_gst || invoice.totalGst || 0)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>CGST (Central Tax)</span>
                      <span className="font-mono font-medium text-indigo-600">
                        {fmt(invoice.cgst || (invoice.total_gst ? invoice.total_gst / 2 : 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>SGST (State Tax)</span>
                      <span className="font-mono font-medium text-indigo-600">
                        {fmt(invoice.sgst || (invoice.total_gst ? invoice.total_gst / 2 : 0))}
                      </span>
                    </div>
                  </>
                )}

                <div className="border-t border-border pt-2 flex justify-between items-center">
                  <span className="font-bold text-sm text-foreground">Total Invoice Amount</span>
                  <span className="font-mono font-bold text-base text-primary">
                    {fmt(totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-emerald-600 pt-1">
                  <span>Amount Settled / Paid</span>
                  <span className="font-mono font-semibold">
                    {fmt(paidAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-rose-600 border-t border-dashed pt-1">
                  <span className="font-bold">Remaining Balance Due</span>
                  <span className="font-mono font-bold text-sm">
                    {fmt(remainingBalance)}
                  </span>
                </div>
              </div>

              {/* Amount in Words */}
              <div className="p-2.5 bg-muted/30 rounded border text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Amount in Words: </span>
                <span className="italic">{numberToWords(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature Block */}
          <div className="flex justify-between items-end pt-4">
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p>This is a computer-generated tax invoice issued by Master HRMS & ERP.</p>
              <p>Registered under single-schema tenant isolation contract.</p>
            </div>

            <div className="text-right space-y-1">
              <div className="h-10 flex items-center justify-end">
                <span className="font-serif italic text-lg text-primary select-none opacity-80 underline decoration-primary/40">
                  Authorized Signatory
                </span>
              </div>
              <p className="text-xs font-bold text-foreground">Master HRMS Financial Comptroller</p>
              <p className="text-[10px] text-muted-foreground">Authorized Commercial Representative</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== PAYMENT HISTORY AUDIT TRAIL ===== */}
      <Card className="print:hidden border border-border shadow-xs">
        <CardHeader className="py-4 px-6 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="size-4 text-emerald-600" /> Payment & Transaction Ledger
            </CardTitle>
            <CardDescription className="text-xs">
              Recorded client remittances linked to General Ledger accounts
            </CardDescription>
          </div>
          {!isPaid && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenPayment}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              <DollarSign className="size-3.5 mr-1" /> Add Payment
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {(!invoice.payments || invoice.payments.length === 0) ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No payments recorded yet. Record a payment once the client remits funds.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead className="text-xs">Payment Date</TableHead>
                  <TableHead className="text-xs">Reference No</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                  <TableHead className="text-xs text-right">Amount Settled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id} className="text-xs">
                    <TableCell className="font-mono text-muted-foreground">
                      {new Date(p.paidAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-mono font-medium text-foreground">
                      {p.referenceNo || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {p.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.notes || "Client remittance"}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">
                      +{fmt(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ===== RECORD PAYMENT MODAL ===== */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <DollarSign className="size-5 text-emerald-600" /> Record Client Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Posting remittance for invoice <span className="font-mono font-semibold">#{invoiceNo}</span>. This will automatically update the General Ledger and AR balance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
            <div className="p-3 bg-secondary/30 rounded-lg border flex justify-between items-center">
              <div>
                <span className="text-[11px] text-muted-foreground block">Remaining Balance Due</span>
                <span className="font-mono font-bold text-base text-rose-600">
                  {fmt(remainingBalance)}
                </span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">
                Direct Ledger Sync
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Amount ({sysConfig?.currency || "INR"}) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingBalance}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Mode *</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                    <SelectItem value="UPI / Razorpay">UPI / Razorpay</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Date *</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reference / UTR / Check # *</Label>
              <Input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. UTR12345678"
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes / Remarks</Label>
              <Textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Optional notes regarding this remittance..."
                className="text-xs h-18 resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentModalOpen(false)}
                disabled={recordPaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                disabled={recordPaymentMutation.isPending}
              >
                {recordPaymentMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" /> Recording...
                  </>
                ) : (
                  "Confirm & Post Payment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
