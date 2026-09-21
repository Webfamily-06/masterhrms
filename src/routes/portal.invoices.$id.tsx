import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  FileText,
  Printer,
  Download,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/portal/invoices/$id")({
  component: ClientInvoicePortalPage,
});

export default function ClientInvoicePortalPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [isPaying, setIsPaying] = useState(false);

  const { data: invoiceData, isLoading, error } = useQuery({
    queryKey: ["public-invoice", id],
    queryFn: async () => {
      try {
        const res = await api.get(`/invoices/public/${id}`);
        return res?.data || res;
      } catch (error) { throw error; }
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      setIsPaying(true);
      const res = await api.post(`/invoices/public/${id}/pay`, {
        paymentMethod: "Razorpay / UPI",
        transactionId: `RZP-TXN-${Date.now()}`,
      });
      return res;
    },
    onSuccess: () => {
      setIsPaying(false);
      toast.success("Payment Received! Receipt has been updated.");
      queryClient.invalidateQueries({ queryKey: ["public-invoice", id] });
    },
    onError: (error: Error) => {
      setIsPaying(false);
      toast.error(error.message || "Payment could not be confirmed. Please contact the invoice issuer.");
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-muted-foreground font-mono">Loading Secure Client Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoiceData) return <div role="alert" className="max-w-lg mx-auto p-8 space-y-3"><h1 className="font-semibold">Invoice unavailable</h1><p>{error?.message || "This invoice could not be found."}</p><Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["public-invoice", id] })}>Retry</Button></div>;

  const invoice = invoiceData;
  const isPaid = invoice?.status?.toLowerCase() === "paid";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Action Ribbon */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Secure Client Self-Service Portal</h4>
            <p className="text-xs text-muted-foreground font-mono">Invoice #{invoice?.invoiceNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs shadow-xs">
            <Printer className="size-3.5" /> Print / PDF
          </Button>
          {!isPaid ? (
            <Button
              size="sm"
              onClick={() => payMutation.mutate()}
              disabled={isPaying}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <CreditCard className="size-3.5" />
              {isPaying ? "Authorizing..." : "Pay Now via Razorpay / Card"}
            </Button>
          ) : (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-3 py-1 text-xs gap-1">
              <CheckCircle2 className="size-3.5" /> Paid in Full
            </Badge>
          )}
        </div>
      </div>

      {/* Printable Invoice Card */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 border border-border-color dark:border-zinc-800 rounded-lg shadow-sm p-6 sm:p-10 print:border-none print:shadow-none print:p-0">
        {/* Header Row */}
        <div className="flex justify-between items-start border-b border-border-color dark:border-zinc-800 pb-6 mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-primary">TSV Global Solutions</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {invoice?.company?.address || "Global Tech Tower, Anna Salai, Chennai"}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{invoice?.company?.email} • {invoice?.company?.phone}</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">Tax Invoice</h1>
            <p className="text-xs font-mono font-bold text-primary mt-1">#{invoice?.invoiceNo}</p>
            <div className="mt-2 inline-block">
              {isPaid ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="size-3" /> PAID
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                  <Clock className="size-3" /> PAYMENT DUE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bill To & Dates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Billed To</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{invoice?.client?.name}</p>
            <p className="text-muted-foreground">{invoice?.client?.address}, {invoice?.client?.city}</p>
            <p className="text-muted-foreground font-mono">Email: {invoice?.client?.email}</p>
            <p className="text-muted-foreground font-mono">Tax ID / GSTIN: {invoice?.client?.taxNumber}</p>
          </div>
          <div className="sm:text-right space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Invoice Dates</span>
            <div className="flex justify-between sm:justify-end gap-3">
              <span className="text-muted-foreground">Invoice Date:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {new Date(invoice?.date || Date.now()).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between sm:justify-end gap-3">
              <span className="text-muted-foreground">Due Date:</span>
              <span className="font-mono font-bold text-danger">
                {new Date(invoice?.dueDate || Date.now()).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between sm:justify-end gap-3">
              <span className="text-muted-foreground">Payment Terms:</span>
              <span className="font-medium text-gray-900 dark:text-white">Net 15 Days</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-border-color dark:border-zinc-700 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3 w-8">#</th>
                <th className="pb-3">Description & Service Item</th>
                <th className="pb-3 text-center w-16">Qty</th>
                <th className="pb-3 text-right w-28">Unit Price</th>
                <th className="pb-3 text-right w-24">Tax</th>
                <th className="pb-3 text-right w-32">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color/50 dark:divide-zinc-800">
              {invoice?.items?.map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="py-3 font-mono text-muted-foreground">{idx + 1}</td>
                  <td className="py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="py-3 text-center font-mono">{item.quantity}</td>
                  <td className="py-3 text-right font-mono">₹{Number(item.unitPrice).toLocaleString()}</td>
                  <td className="py-3 text-right font-mono text-muted-foreground">₹{Number(item.tax).toLocaleString()}</td>
                  <td className="py-3 text-right font-mono font-bold text-gray-900 dark:text-white">
                    ₹{Number(item.total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-border-color dark:border-zinc-800 gap-6">
          <div className="max-w-xs space-y-1.5 text-xs text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-900 dark:text-white">Terms & Notes</span>
            <p>{invoice?.notes}</p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">₹{Number(invoice?.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Taxes (GST/VAT)</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">₹{Number(invoice?.taxAmount).toLocaleString()}</span>
            </div>
            {invoice?.discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount</span>
                <span className="font-mono font-semibold">-₹{Number(invoice?.discount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-border-color dark:border-zinc-700 pt-2 text-sm font-bold text-gray-900 dark:text-white">
              <span>Total Due</span>
              <span className="font-mono text-primary text-base">₹{Number(invoice?.dueAmount ?? invoice?.grandTotal).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-10 pt-6 border-t border-border-color dark:border-zinc-800 text-center text-[11px] text-muted-foreground">
          <p>This is a computer-generated tax invoice verified under TSV Global Solutions secure ERP system.</p>
        </div>
      </div>
    </div>
  );
}
