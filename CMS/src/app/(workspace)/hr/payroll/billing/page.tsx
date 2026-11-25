"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ContractStaffingBillingPage() {
  const [selectedRunId, setSelectedRunId] = useState("");
  const [serviceChargePct, setServiceChargePct] = useState("10");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNo: `INV/${new Date().getFullYear()}/001`,
    invoiceDate: todayISO(),
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    placeOfSupply: "Tamil Nadu (33)",
    supplierGstin: "",
    clientName: "",
    clientAddress: "",
    clientGstin: "",
    supplierBankDetails: "",
  });

  const { data: runs = [] } = useQuery<any[]>({
    queryKey: ["hr-payroll-runs-for-billing"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/runs");
      const payload = res?.data ?? res ?? {};
      return Array.isArray(payload.runs) ? payload.runs : [];
    },
  });

  useEffect(() => {
    if (!selectedRunId && runs.length > 0) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  const { data: billing, isLoading } = useQuery<any>({
    queryKey: ["hr-payroll-billing-summary", selectedRunId, serviceChargePct],
    enabled: Boolean(selectedRunId),
    queryFn: async () => {
      const res = await api.get(`/api/v1/hr/payroll/runs/${selectedRunId}/billing-summary`, {
        params: { serviceChargePct: Number(serviceChargePct) || 10 },
      });
      return res?.data ?? res;
    },
  });

  const handleDownloadMasterExcel = async () => {
    if (!selectedRunId) return;
    try {
      setDownloadingExcel(true);
      await api.download(
        `/api/v1/hr/payroll/runs/${selectedRunId}/export/master-excel?serviceChargePct=${Number(serviceChargePct) || 10}`,
        `Master_Payroll_Billing_${selectedRunId.slice(0, 8)}.xlsx`
      );
      toast.success("Master Payroll & Billing Excel downloaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download Master Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadTaxInvoice = async () => {
    if (!selectedRunId) return;
    try {
      setDownloadingPdf(true);
      const token = getAuthToken();
      const resp = await fetch(`/api/v1/hr/payroll/runs/${selectedRunId}/tax-invoice/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...invoiceForm,
          serviceChargePct: Number(serviceChargePct) || 10,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Tax Invoice PDF failed");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tax_Invoice_${invoiceForm.invoiceNo.replace(/[^a-zA-Z0-9_-]+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("HSN 998517 Tax Invoice PDF downloaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download Tax Invoice PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const s = billing?.summary;

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Client Billing &amp; Tax Invoices
          </h1>
          <p className="text-sm text-muted-foreground">
            Reconcile Billable CTC, EPF/EDLI/Admin charges, MMU Service Charges, and generate HSN 998517 GST Tax Invoices in INR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedRunId || downloadingExcel}
            onClick={handleDownloadMasterExcel}
            className="h-9 gap-1.5"
          >
            <i className="ph ph-file-xls text-base text-emerald-600" />
            <span>{downloadingExcel ? "Exporting..." : "Master Payroll Excel"}</span>
          </Button>
          <Button
            size="sm"
            disabled={!selectedRunId || downloadingPdf}
            onClick={handleDownloadTaxInvoice}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <i className="ph ph-file-pdf text-base" />
            <span>{downloadingPdf ? "Generating..." : "Download Tax Invoice PDF"}</span>
          </Button>
        </div>
      </div>

      {/* Payroll Run & Markup Selector */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-2 space-y-1.5">
          <Label>Select Payroll Run</Label>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Choose a Payroll Run</option>
            {runs.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.employeeCount} employees • Net {formatINR(r.netPay)})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Service Charge / MMU (%)</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={serviceChargePct}
            onChange={(e) => setServiceChargePct(e.target.value)}
          />
        </div>
      </div>

      {/* Billing Summary KPIs */}
      {s && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
            <div className="text-xs text-muted-foreground">Billable CTC ({s.employeeCount} staff)</div>
            <div className="text-2xl font-bold text-foreground mt-1">{formatINR(s.billableCtc)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Net Pay {formatINR(s.netSalaryPayable)} + PF {formatINR(s.pfContribution)}
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
            <div className="text-xs text-muted-foreground">MMU Service Charge ({s.serviceChargePct}%)</div>
            <div className="text-2xl font-bold text-primary mt-1">{formatINR(s.mmuAmount)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Sub Total: {formatINR(s.subTotal)}
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
            <div className="text-xs text-muted-foreground">GST (CGST 9% + SGST 9%)</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{formatINR(s.totalGst)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              CGST {formatINR(s.cgst)} • SGST {formatINR(s.sgst)}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xs">
            <div className="text-xs text-emerald-700 font-semibold">Final Tax Invoice Total</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {formatINR(s.invoiceTotal)}
            </div>
            <div className="text-[11px] text-emerald-700/90 mt-1 truncate">{s.amountInWords}</div>
          </div>
        </div>
      )}

      {/* 2-Column Invoice Form + Live Reconciliation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Tax Invoice Details (HSN 998517)</h2>
            <p className="text-xs text-muted-foreground">
              Populate client billing information and NEFT bank instructions for the PDF invoice.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Invoice Number</Label>
              <Input
                value={invoiceForm.invoiceNo}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Date</Label>
              <Input
                type="date"
                value={invoiceForm.invoiceDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Client Name (Bill To / Ship To)</Label>
              <Input
                value={invoiceForm.clientName}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, clientName: e.target.value })}
                placeholder="e.g., Enabl Engineering Private Limited"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client GSTIN</Label>
              <Input
                value={invoiceForm.clientGstin}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, clientGstin: e.target.value })}
                placeholder="e.g., 33AAGCE3815L1ZN"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Client Billing Address</Label>
            <Textarea
              rows={2}
              value={invoiceForm.clientAddress}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, clientAddress: e.target.value })}
              placeholder="Client registered address..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Supplier GSTIN</Label>
              <Input
                value={invoiceForm.supplierGstin}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierGstin: e.target.value })}
                placeholder="e.g., 33AAICP1477F1ZH"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Place of Supply</Label>
              <Input
                value={invoiceForm.placeOfSupply}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, placeOfSupply: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>NEFT / RTGS Bank Details</Label>
            <Textarea
              rows={2}
              value={invoiceForm.supplierBankDetails}
              onChange={(e) =>
                setInvoiceForm({ ...invoiceForm, supplierBankDetails: e.target.value })
              }
              placeholder="A/C Number, IFSC Code, Bank Name..."
            />
          </div>
        </div>

        {/* Right Live Reconciliation Breakdown */}
        <div className="lg:col-span-5 rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-foreground">Payroll &amp; Billing Reconciliation</h2>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Calculating live billing totals...
            </div>
          ) : !s ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Select a completed Payroll Run to preview billing totals.
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {[
                { label: "Total Gross Earnings", val: s.totalGross },
                { label: "PF Remittance (EE + ER + EDLI + Admin)", val: s.pfContribution },
                { label: "ESIC Contribution", val: s.esicContribution },
                { label: "Net Salary Payable to Employees", val: s.netSalaryPayable },
                { label: "Billable CTC (Line 1)", val: s.billableCtc, bold: true },
                { label: `Service Charges / MMU (${s.serviceChargePct}%) (Line 2)`, val: s.mmuAmount },
                { label: "Taxable Sub Total", val: s.subTotal, bold: true },
                { label: "CGST (9%)", val: s.cgst },
                { label: "SGST (9%)", val: s.sgst },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between py-1.5 border-b border-border/60 ${
                    item.bold ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-semibold text-foreground">{formatINR(item.val)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 text-base font-bold text-emerald-700">
                <span>Total Invoice Payable</span>
                <span>{formatINR(s.invoiceTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground italic pt-1">{s.amountInWords}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
