import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Printer,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Receipt,
  QrCode,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/invoice/$id/print")({
  component: InvoicePrintPage,
  head: () => ({ meta: [{ title: "Print Sales Invoice — Master ERP" }] }),
});

export function InvoicePrintPage() {
  const { id } = Route.useParams();
  const { data: profile } = useCurrentProfile();
  const [autoPrinted, setAutoPrinted] = useState(false);

  // Fetch Invoice Details
  const { data: invoice, isLoading, error } = useQuery<any>({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await api.get(`/invoices/${id}`);
      return res;
    },
    staleTime: 30_000,
  });

  const handlePrint = () => {
    window.print();
  };

  // Optional auto-print if ?auto=true or standard load
  useEffect(() => {
    if (invoice && !autoPrinted) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auto") === "true") {
        setAutoPrinted(true);
        const timer = setTimeout(() => {
          window.print();
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [invoice, autoPrinted]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Preparing printable invoice layout...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <h2 className="text-lg font-bold">Invoice Not Found</h2>
        <p className="text-xs text-muted-foreground">
          Could not load the invoice for printing. It may have been deleted or belong to another workspace.
        </p>
        <Link to="/invoices">
          <Button size="sm" variant="outline">
            <ArrowLeft className="size-3.5 mr-1.5" /> Back to Invoices
          </Button>
        </Link>
      </div>
    );
  }

  const invoiceNo = invoice.number || invoice.invoiceNo || invoice.id;
  const totalAmount = Number(invoice.total || invoice.amount || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const remainingBalance = invoice.remainingBalance ?? Math.max(0, totalAmount - paidAmount);
  const isPaid = invoice.status === "paid" || remainingBalance <= 0;
  const isPartial = !isPaid && paidAmount > 0;

  const lines = invoice.lines || [];
  const payments = invoice.payments || [];
  const taxMode = invoice.taxMode || invoice.tax_mode || "sgst_cgst";

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950/40 p-4 sm:p-8 print:p-0 print:bg-white print:m-0">
      {/* ===== ACTION BAR (HIDDEN IN PRINT) ===== */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/invoice/$id" params={{ id }}>
            <Button size="sm" variant="outline" className="text-xs">
              <ArrowLeft className="size-3.5 mr-1.5" /> Back to Passport
            </Button>
          </Link>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              Print Document: <span className="font-mono text-primary">#{invoiceNo}</span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Official Tax Invoice Layout &bull; Formatted for A4 / Letter Print & PDF Export
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handlePrint}
            className="gap-2 font-bold shadow-sm"
          >
            <Printer className="size-4" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* ===== PRINTABLE INVOICE SHEET (MATCHING Laravel Print.tsx) ===== */}
      <div
        id="printable-document"
        className="max-w-4xl mx-auto bg-white dark:bg-card text-foreground p-8 sm:p-12 rounded-xl shadow-sm border border-border print:border-0 print:shadow-none print:p-0 print:m-0 print:w-full"
      >
        {/* Row 1: Header - Company Details vs Invoice Details */}
        <div className="flex justify-between items-start gap-8 border-b border-gray-200 dark:border-border pb-8">
          <div className="w-7/12 space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary text-white font-black flex items-center justify-center text-lg print:text-black print:bg-gray-100">
                ERP
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 dark:text-foreground tracking-tight">
                  {profile?.tenant?.name || "Master HRMS & ERP Enterprise"}
                </h1>
                <p className="text-xs text-gray-500">Commercial Cloud SaaS & Global Enterprise Operations</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 dark:text-muted-foreground space-y-0.5 pt-2">
              <p>Corporate Headquarters &bull; Tech Park Campus</p>
              <p>Email: billing@enterprise-erp.com &bull; Phone: +91 (080) 4123 5678</p>
              <p className="font-mono text-gray-800 dark:text-foreground font-semibold">
                GSTIN: 29AAAAA0000A1Z5 &bull; PAN: AAAAA0000A &bull; State Code: 29 (Karnataka)
              </p>
            </div>
          </div>

          <div className="w-5/12 text-right space-y-1">
            <div className="inline-block px-3 py-1 bg-primary/10 text-primary font-black text-sm uppercase rounded tracking-wider print:border print:border-gray-300">
              Tax Invoice
            </div>
            <div className="font-mono text-lg font-black text-gray-900 dark:text-foreground pt-1">
              #{invoiceNo}
            </div>
            <div className="text-xs space-y-0.5 text-gray-600 dark:text-muted-foreground">
              <p>
                <span className="font-medium text-gray-900 dark:text-foreground">Invoice Date:</span>{" "}
                {invoice.date ? new Date(invoice.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-foreground">Payment Due:</span>{" "}
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-foreground">Payment Terms:</span>{" "}
                {invoice.paymentTerms || "Net 30 Days"}
              </p>
            </div>

            <div className="pt-2">
              <span
                className={cn(
                  "inline-block px-2.5 py-0.5 text-[11px] font-bold uppercase rounded",
                  isPaid
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : isPartial
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                )}
              >
                {isPaid ? "PAID IN FULL" : isPartial ? "PARTIALLY PAID" : "PAYMENT PENDING"}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Bill To & Ship To */}
        <div className="grid grid-cols-2 gap-8 py-6 border-b border-gray-200 dark:border-border text-xs">
          <div className="space-y-1">
            <h3 className="font-bold uppercase tracking-wider text-gray-500 text-[10px]">Billed To (Customer)</h3>
            <p className="font-bold text-sm text-gray-900 dark:text-foreground">{invoice.client || "Client Customer"}</p>
            <p className="text-gray-600 dark:text-muted-foreground">{invoice.client_address || invoice.clientAddress || "Office Address"}</p>
            {(invoice.client_email || invoice.clientEmail) && (
              <p className="text-gray-600 dark:text-muted-foreground">Email: {invoice.client_email || invoice.clientEmail}</p>
            )}
            {invoice.client_phone && (
              <p className="text-gray-600 dark:text-muted-foreground">Phone: {invoice.client_phone}</p>
            )}
            {(invoice.client_gstin || invoice.clientGstin) && (
              <p className="font-mono text-gray-900 dark:text-foreground font-semibold pt-0.5">
                GSTIN: {invoice.client_gstin || invoice.clientGstin}
              </p>
            )}
          </div>

          <div className="space-y-1 text-right sm:text-left">
            <h3 className="font-bold uppercase tracking-wider text-gray-500 text-[10px]">Shipped / Supplied To</h3>
            <p className="font-bold text-sm text-gray-900 dark:text-foreground">{invoice.client || "Client Customer"}</p>
            <p className="text-gray-600 dark:text-muted-foreground">
              {invoice.shipping_address || invoice.client_address || invoice.clientAddress || "Same as Billing Address"}
            </p>
            <p className="text-gray-600 dark:text-muted-foreground">
              Place of Supply:{" "}
              <strong>
                {invoice.customerState ? `State Code ${invoice.customerState}` : "Domestic Intra/Inter-state"}
              </strong>
            </p>
            <p className="text-gray-600 dark:text-muted-foreground">
              Tax Mode:{" "}
              <strong className="uppercase">
                {taxMode === "igst" ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
              </strong>
            </p>
          </div>
        </div>

        {/* Row 3: Itemized Line Items Table */}
        <div className="py-6 border-b border-gray-200 dark:border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-gray-300 dark:border-border text-gray-700 dark:text-foreground">
                <th className="py-2.5 text-left font-bold w-8">#</th>
                <th className="py-2.5 text-left font-bold">Item Description</th>
                <th className="py-2.5 text-center font-bold">HSN/SAC</th>
                <th className="py-2.5 text-center font-bold">Qty</th>
                <th className="py-2.5 text-right font-bold">Rate</th>
                <th className="py-2.5 text-center font-bold">Tax</th>
                <th className="py-2.5 text-right font-bold">Tax Amt</th>
                <th className="py-2.5 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-border/60">
              {lines.map((line: any, idx: number) => {
                const qty = Number(line.qty || line.quantity || 1);
                const rate = Number(line.rate || line.unitPrice || line.price || 0);
                const taxRate = Number(line.gst_rate !== undefined ? line.gst_rate : line.taxRate || 0);
                const taxAmt = Number(line.gst_amount !== undefined ? line.gst_amount : line.taxAmount || ((qty * rate * taxRate) / 100));
                const total = (qty * rate) + taxAmt;

                return (
                  <tr key={line.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-muted/10">
                    <td className="py-3 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-3 font-semibold text-gray-900 dark:text-foreground">
                      <div>{line.description || line.productName || line.name || "Item"}</div>
                      {line.sku && <div className="text-[10px] text-gray-400 font-mono">SKU: {line.sku}</div>}
                    </td>
                    <td className="py-3 text-center font-mono text-gray-600 dark:text-muted-foreground">
                      {line.hsn_sac || line.hsnSac || "—"}
                    </td>
                    <td className="py-3 text-center font-mono">
                      {qty} {line.unit || "Pcs"}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {formatSystemAmount(rate, { defaultCurrency: "INR" })}
                    </td>
                    <td className="py-3 text-center font-mono text-gray-600">
                      {taxRate}%
                    </td>
                    <td className="py-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                      +{formatSystemAmount(taxAmt, { defaultCurrency: "INR" })}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-gray-900 dark:text-foreground">
                      {formatSystemAmount(total, { defaultCurrency: "INR" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Row 4: GST Summary Breakup & Final Amounts */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 py-6 border-b border-gray-200 dark:border-border text-xs">
          {/* GST Tax Summary Box */}
          <div className="sm:col-span-6 space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-gray-500 text-[10px]">
              GST Tax Breakdown Summary
            </h4>
            <div className="border border-gray-200 dark:border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-muted/30">
                  <tr className="border-b border-gray-200 dark:border-border text-gray-600">
                    <th className="p-2 text-left">Tax Component</th>
                    <th className="p-2 text-center">Rate</th>
                    <th className="p-2 text-right">Tax Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-border/40">
                  {taxMode === "igst" ? (
                    <tr>
                      <td className="p-2 font-medium">Integrated GST (IGST)</td>
                      <td className="p-2 text-center font-mono">18%</td>
                      <td className="p-2 text-right font-mono font-semibold text-primary">
                        {formatSystemAmount(Number(invoice.igst || invoice.total_gst || invoice.totalTax || 0), { defaultCurrency: "INR" })}
                      </td>
                    </tr>
                  ) : (
                    <>
                      <tr>
                        <td className="p-2 font-medium">Central GST (CGST)</td>
                        <td className="p-2 text-center font-mono">9%</td>
                        <td className="p-2 text-right font-mono font-semibold">
                          {formatSystemAmount(Number(invoice.cgst || (Number(invoice.total_gst || invoice.totalTax || 0) / 2)), { defaultCurrency: "INR" })}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">State GST (SGST)</td>
                        <td className="p-2 text-center font-mono">9%</td>
                        <td className="p-2 text-right font-mono font-semibold">
                          {formatSystemAmount(Number(invoice.sgst || (Number(invoice.total_gst || invoice.totalTax || 0) / 2)), { defaultCurrency: "INR" })}
                        </td>
                      </tr>
                    </>
                  )}
                  <tr className="bg-gray-50/50 dark:bg-muted/10 font-bold">
                    <td className="p-2">Total Tax Assessed</td>
                    <td className="p-2 text-center font-mono">—</td>
                    <td className="p-2 text-right font-mono text-primary">
                      {formatSystemAmount(Number(invoice.totalTax || invoice.total_gst || invoice.totalGst || 0), { defaultCurrency: "INR" })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bank Remittance Details */}
            <div className="pt-2 text-gray-600 dark:text-muted-foreground space-y-0.5">
              <p className="font-semibold text-gray-800 dark:text-foreground">Bank Remittance Details:</p>
              <p>Bank: HDFC Bank Limited &bull; Branch: Indiranagar, Bengaluru</p>
              <p className="font-mono">A/C No: 50200012345678 &bull; IFSC: HDFC0000123</p>
            </div>
          </div>

          {/* Amount Totals Box */}
          <div className="sm:col-span-6 space-y-2 sm:pl-4">
            <div className="space-y-1.5 p-4 rounded-lg bg-gray-50 dark:bg-muted/20 border border-gray-200 dark:border-border">
              <div className="flex justify-between items-center text-gray-600 dark:text-muted-foreground">
                <span>Taxable Subtotal</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-foreground">
                  {formatSystemAmount(Number(invoice.subtotal || 0), { defaultCurrency: "INR" })}
                </span>
              </div>

              {taxMode === "igst" ? (
                <div className="flex justify-between items-center text-gray-600 dark:text-muted-foreground">
                  <span>Integrated GST (IGST)</span>
                  <span className="font-mono font-semibold text-primary">
                    +{formatSystemAmount(Number(invoice.igst || invoice.total_gst || invoice.totalTax || 0), { defaultCurrency: "INR" })}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center text-gray-600 dark:text-muted-foreground">
                    <span>Central GST (CGST)</span>
                    <span className="font-mono font-semibold">
                      +{formatSystemAmount(Number(invoice.cgst || (Number(invoice.total_gst || invoice.totalTax || 0) / 2)), { defaultCurrency: "INR" })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 dark:text-muted-foreground">
                    <span>State GST (SGST)</span>
                    <span className="font-mono font-semibold">
                      +{formatSystemAmount(Number(invoice.sgst || (Number(invoice.total_gst || invoice.totalTax || 0) / 2)), { defaultCurrency: "INR" })}
                    </span>
                  </div>
                </>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between items-center text-base font-black text-gray-900 dark:text-foreground">
                <span>Grand Total</span>
                <span className="font-mono text-primary">
                  {formatSystemAmount(totalAmount, { defaultCurrency: "INR" })}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                <span>Paid / Settled Amount</span>
                <span className="font-mono">
                  {formatSystemAmount(paidAmount, { defaultCurrency: "INR" })}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs font-bold text-destructive">
                <span>Balance Due</span>
                <span className="font-mono">
                  {formatSystemAmount(remainingBalance, { defaultCurrency: "INR" })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 5: Payment History (if any) */}
        {payments.length > 0 && (
          <div className="py-6 border-b border-gray-200 dark:border-border text-xs">
            <h4 className="font-bold uppercase tracking-wider text-gray-500 text-[10px] mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Recorded Payment Settlements ({payments.length})
            </h4>
            <div className="border border-gray-200 dark:border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-muted/30">
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Method</th>
                    <th className="p-2 text-left">Reference No</th>
                    <th className="p-2 text-right">Amount Settled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="p-2 font-mono">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="p-2 font-medium">{p.method}</td>
                      <td className="p-2 font-mono text-gray-500">{p.referenceNo || "—"}</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-600">
                        {formatSystemAmount(Number(p.amount), { defaultCurrency: "INR" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Row 6: Signatures, Terms & Verification Footer */}
        <div className="pt-8 flex justify-between items-end text-xs">
          <div className="w-7/12 space-y-2">
            <p className="font-bold text-gray-700 dark:text-foreground">Terms & Conditions:</p>
            <p className="text-gray-500 text-[11px] leading-relaxed max-w-md">
              1. Goods / Services once confirmed cannot be refunded.
              <br />
              2. Disputes, if any, subject to jurisdiction of local courts only.
              <br />
              3. This is a computer-generated tax invoice verified under enterprise ERP standard audit rules.
            </p>
          </div>

          <div className="w-4/12 text-center space-y-1">
            <div className="h-16 border-b border-gray-400 mx-auto w-44"></div>
            <p className="font-bold text-gray-900 dark:text-foreground">Authorized Signatory</p>
            <p className="text-[10px] text-gray-400">{profile?.tenant?.name || "Global Cloud Systems"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
