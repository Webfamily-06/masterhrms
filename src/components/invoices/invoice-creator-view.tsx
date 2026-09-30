import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  ArrowLeft,
  Building2,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Warehouse,
  User,
  ShieldCheck,
  CreditCard,
  Percent,
  DollarSign,
  Loader2,
} from "lucide-react";
import { LineItemRepeater, LineItem } from "@/components/ui/repeater";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Standard Indian State Codes for GST determination
export const INDIAN_GST_STATES = [
  { code: "29", name: "Karnataka" },
  { code: "27", name: "Maharashtra" },
  { code: "07", name: "Delhi" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "24", name: "Gujarat" },
  { code: "19", name: "West Bengal" },
  { code: "06", name: "Haryana" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "32", name: "Kerala" },
  { code: "08", name: "Rajasthan" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "21", name: "Odisha" },
  { code: "03", name: "Punjab" },
  { code: "10", name: "Bihar" },
  { code: "18", name: "Assam" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "30", name: "Goa" },
  { code: "05", name: "Uttarakhand" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "01", name: "Jammu & Kashmir" },
  { code: "99", name: "Other Territory / Overseas" },
];

export interface InvoiceCreatorViewProps {
  onCancel?: () => void;
  onSuccess?: (createdInvoice: any) => void;
  initialValues?: Partial<{
    client: string;
    clientEmail: string;
    clientGstin: string;
    clientAddress: string;
    customerState: string;
  }>;
}

export function InvoiceCreatorView({
  onCancel,
  onSuccess,
  initialValues,
}: InvoiceCreatorViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentProfile();

  // Form State
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const [customerId, setCustomerId] = useState<string>("");
  const [clientName, setClientName] = useState<string>(initialValues?.client || "");
  const [clientEmail, setClientEmail] = useState<string>(initialValues?.clientEmail || "");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [clientGstin, setClientGstin] = useState<string>(initialValues?.clientGstin || "");
  const [billingAddress, setBillingAddress] = useState<string>(initialValues?.clientAddress || "");
  const [shippingAddress, setShippingAddress] = useState<string>("");
  const [sameAsBilling, setSameAsBilling] = useState<boolean>(true);

  const [warehouseId, setWarehouseId] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("Net 30 Days");
  const [notes, setNotes] = useState<string>("Thank you for your business. Please remit payment via NEFT/RTGS to our bank account.");
  const [terms, setTerms] = useState<string>("Interest @ 18% p.a. will be charged on delayed payments beyond due date.");

  // Indian GST Settings
  const companyState = "29"; // Default Karnataka state
  const [customerState, setCustomerState] = useState<string>(initialValues?.customerState || "29");
  const [manualTaxModeOverride, setManualTaxModeOverride] = useState<"auto" | "sgst_cgst" | "igst">("auto");

  // Line items state managed via Tier 2 Repeater
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: "line_1",
      name: "Enterprise Cloud Subscription & Support",
      description: "Monthly recurring enterprise platform license",
      quantity: 1,
      unitPrice: 5000,
      taxRate: 18,
      discount: 0,
      discountType: "fixed",
      hsnSac: "998313",
    },
  ]);

  // Fetch Customers for Auto-fill
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["customers", "list"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/customers");
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Warehouses
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ["warehouses", "list"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/warehouses");
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Products Catalog for Repeater Auto-complete
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["products", "catalog"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/products");
        const list = res.data?.products || (Array.isArray(res.data) ? res.data : []);
        return list.map((p: any) => ({
          id: p.id,
          name: p.name,
          salePrice: Number(p.salePrice || p.price || 0),
          sku: p.sku || "",
          hsnSac: p.hsnSac || "",
          taxRate: Number(p.taxRate || 18),
        }));
      } catch {
        return [];
      }
    },
  });

  // Handle Customer Selection
  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setClientName(found.name || "");
      setClientEmail(found.email || "");
      setClientPhone(found.phone || "");
      setClientGstin(found.gstin || "");
      setBillingAddress(found.address || found.billingAddress || "");
      if (found.shippingAddress) {
        setShippingAddress(found.shippingAddress);
        setSameAsBilling(false);
      }

      // Auto detect state from GSTIN
      if (found.gstin && found.gstin.length >= 2) {
        const detected = found.gstin.slice(0, 2);
        if (INDIAN_GST_STATES.some((s) => s.code === detected)) {
          setCustomerState(detected);
        }
      }
    }
  };

  // Update State detection whenever client GSTIN changes manually
  useEffect(() => {
    if (clientGstin && clientGstin.length >= 2) {
      const prefix = clientGstin.slice(0, 2);
      if (INDIAN_GST_STATES.some((s) => s.code === prefix)) {
        setCustomerState(prefix);
      }
    }
  }, [clientGstin]);

  // Determine Effective Tax Mode
  const effectiveTaxMode = useMemo<"sgst_cgst" | "igst">(() => {
    if (manualTaxModeOverride !== "auto") {
      return manualTaxModeOverride;
    }
    return customerState === companyState ? "sgst_cgst" : "igst";
  }, [customerState, companyState, manualTaxModeOverride]);

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    lineItems.forEach((item) => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitPrice || 0);
      const gross = qty * price;

      let disc = 0;
      if (item.discountType === "percent") {
        disc = (gross * Number(item.discount || 0)) / 100;
      } else {
        disc = Number(item.discount || 0);
      }

      const taxable = Math.max(0, gross - disc);
      const taxRate = Number(item.taxRate || 0);
      const tax = (taxable * taxRate) / 100;

      subtotal += taxable;
      totalDiscount += disc;
      totalTax += tax;
    });

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (effectiveTaxMode === "igst") {
      igst = totalTax;
    } else {
      cgst = totalTax / 2;
      sgst = totalTax / 2;
    }

    const grandTotal = subtotal + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      cgst,
      sgst,
      igst,
      grandTotal,
    };
  }, [lineItems, effectiveTaxMode]);

  // Create Invoice Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!clientName.trim()) {
        throw new Error("Client or Customer name is required");
      }
      if (lineItems.length === 0) {
        throw new Error("At least one line item is required");
      }

      const payload = {
        client: clientName.trim(),
        client_gstin: clientGstin.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_address: billingAddress.trim(),
        shipping_address: sameAsBilling ? billingAddress.trim() : shippingAddress.trim(),
        customerId: customerId || undefined,
        warehouseId: warehouseId || undefined,
        date: invoiceDate,
        dueDate: dueDate,
        paymentTerms,
        notes,
        terms,
        taxMode: effectiveTaxMode,
        tax_mode: effectiveTaxMode,
        customerState,
        companyState,
        subtotal: calculations.subtotal,
        cgst: calculations.cgst,
        sgst: calculations.sgst,
        igst: calculations.igst,
        totalTax: calculations.totalTax,
        total_gst: calculations.totalTax,
        total: calculations.grandTotal,
        amount: calculations.grandTotal,
        lines: lineItems.map((item) => ({
          productId: item.productId,
          description: item.name,
          name: item.name,
          hsn_sac: item.hsnSac || "",
          qty: Number(item.quantity || 1),
          unit: item.unit || "Pcs",
          rate: Number(item.unitPrice || 0),
          unitPrice: Number(item.unitPrice || 0),
          discount: Number(item.discount || 0),
          gst_rate: Number(item.taxRate || 0),
          taxRate: Number(item.taxRate || 0),
          gst_amount: ((Number(item.quantity || 1) * Number(item.unitPrice || 0) - Number(item.discount || 0)) * Number(item.taxRate || 0)) / 100,
        })),
      };

      const res = await api.post("/api/invoices", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Sales Invoice created and posted successfully!");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["accounting"] });

      if (onSuccess) {
        onSuccess(data);
      } else {
        const id = data.id || data.invoiceNo || data.number;
        navigate({ to: "/invoice/$id", params: { id } });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create sales invoice");
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ===== HEADER NAVIGATION ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => (onCancel ? onCancel() : navigate({ to: "/invoices" }))}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" /> Back to Invoices
          </button>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Receipt className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Create Sales Tax Invoice
              </h1>
              <p className="text-xs text-muted-foreground">
                Full-page invoice builder with Indian GST compliance, line-item repeater & auto-GL posting.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => (onCancel ? onCancel() : navigate({ to: "/invoices" }))}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !clientName.trim()}
            className="gap-2 font-semibold shadow-sm"
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save & Post Invoice
          </Button>
        </div>
      </div>

      {/* ===== FORM GRID: INVOICE METADATA ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer & Invoice Details */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Bill To & Client Information */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <User className="size-4 text-primary" /> Customer & Billing Information
                </CardTitle>
                {customers.length > 0 && (
                  <div className="w-52">
                    <Select value={customerId} onValueChange={handleCustomerSelect}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select existing customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Customer / Client Name *</Label>
                  <Input
                    placeholder="e.g. Acme Technologies Pvt Ltd"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Client GSTIN</Label>
                  <Input
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    value={clientGstin}
                    onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                    className="text-xs font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Client Email</Label>
                  <Input
                    type="email"
                    placeholder="billing@client.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Client Phone</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Billing Address</Label>
                <Textarea
                  placeholder="Street, Building, City, Pin Code"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="sameShipping"
                    checked={sameAsBilling}
                    onChange={(e) => setSameAsBilling(e.target.checked)}
                    className="rounded border-gray-300 text-primary cursor-pointer"
                  />
                  <label htmlFor="sameShipping" className="text-xs font-medium cursor-pointer">
                    Shipping address is the same as billing address
                  </label>
                </div>

                {!sameAsBilling && (
                  <div className="space-y-1.5 mt-2">
                    <Label className="text-xs font-semibold">Shipping Address</Label>
                    <Textarea
                      placeholder="Destination warehouse, site location, or recipient address"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Line Items Repeater */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <FileText className="size-4 text-primary" /> Invoice Line Items & Tax Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Add billable products, service line items, HSN/SAC codes, and specific tax rates.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono">
                  {lineItems.length} {lineItems.length === 1 ? "Line" : "Lines"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <LineItemRepeater
                value={lineItems}
                onChange={setLineItems}
                availableProducts={products}
                allowDiscounts={true}
                allowDescriptions={true}
                minItems={1}
                currency="INR"
                showSummary={false}
              />
            </CardContent>
          </Card>

          {/* Card 3: Notes & Terms */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <ShieldCheck className="size-4 text-primary" /> Terms & Customer Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notes / Bank Remittance Info</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                  placeholder="Notes visible to customer on invoice"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Terms & Conditions</Label>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                  placeholder="Terms of payment, warranties, jurisdiction"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Invoice Setup, Indian GST Engine & Totals */}
        <div className="lg:col-span-4 space-y-6">
          {/* Settings Card: Dates, Warehouse, Terms */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 border-b border-border bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Calendar className="size-3.5 text-primary" /> Invoice Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Invoice Issue Date</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Payment Terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Immediate / Due on Receipt" className="text-xs">Due on Receipt</SelectItem>
                    <SelectItem value="Net 15 Days" className="text-xs">Net 15 Days</SelectItem>
                    <SelectItem value="Net 30 Days" className="text-xs">Net 30 Days</SelectItem>
                    <SelectItem value="Net 45 Days" className="text-xs">Net 45 Days</SelectItem>
                    <SelectItem value="Net 60 Days" className="text-xs">Net 60 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {warehouses.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Warehouse className="size-3.5 text-muted-foreground" /> Outward Warehouse (Optional)
                  </Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select Warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id} className="text-xs">
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Indian GST Engine Card */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Percent className="size-3.5 text-primary" /> Indian GST Engine
                </CardTitle>
                <Badge
                  className={cn(
                    "text-[10px] font-bold border-0",
                    effectiveTaxMode === "igst"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  )}
                >
                  {effectiveTaxMode === "igst" ? "INTER-STATE (IGST)" : "INTRA-STATE (CGST+SGST)"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Place of Supply (Customer State)</Label>
                  <span className="text-[10px] font-mono text-muted-foreground">Code: {customerState}</span>
                </div>
                <Select value={customerState} onValueChange={setCustomerState}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Customer State" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_GST_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code} className="text-xs">
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Company State: Karnataka (29). Inter-state triggers IGST; Intra-state splits into CGST + SGST.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tax Treatment Mode</Label>
                <Select
                  value={manualTaxModeOverride}
                  onValueChange={(v: any) => setManualTaxModeOverride(v)}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Auto-Detect from State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto" className="text-xs">Auto-detect from State Codes</SelectItem>
                    <SelectItem value="sgst_cgst" className="text-xs">Force Intra-State (CGST + SGST)</SelectItem>
                    <SelectItem value="igst" className="text-xs">Force Inter-State (IGST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary Card (Pastel Tokens) */}
          <Card className="border border-indigo-200/50 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-sm overflow-hidden">
            <CardHeader className="p-4 border-b border-indigo-100 dark:border-indigo-900/20 bg-indigo-50/50 dark:bg-indigo-950/30">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                Invoice Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Taxable Subtotal</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatSystemAmount(calculations.subtotal, { defaultCurrency: "INR" })}
                </span>
              </div>

              {calculations.totalDiscount > 0 && (
                <div className="flex justify-between items-center text-emerald-600">
                  <span>Total Discount</span>
                  <span className="font-mono font-medium">
                    -{formatSystemAmount(calculations.totalDiscount, { defaultCurrency: "INR" })}
                  </span>
                </div>
              )}

              {effectiveTaxMode === "sgst_cgst" ? (
                <>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Central GST (CGST)</span>
                    <span className="font-mono text-foreground">
                      +{formatSystemAmount(calculations.cgst, { defaultCurrency: "INR" })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>State GST (SGST)</span>
                    <span className="font-mono text-foreground">
                      +{formatSystemAmount(calculations.sgst, { defaultCurrency: "INR" })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Integrated GST (IGST)</span>
                  <span className="font-mono text-foreground">
                    +{formatSystemAmount(calculations.igst, { defaultCurrency: "INR" })}
                  </span>
                </div>
              )}

              <Separator className="my-1 bg-border" />

              <div className="flex justify-between items-center font-extrabold text-base pt-1">
                <span className="text-foreground">Grand Total</span>
                <span className="font-mono text-primary">
                  {formatSystemAmount(calculations.grandTotal, { defaultCurrency: "INR" })}
                </span>
              </div>

              <div className="pt-4">
                <Button
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !clientName.trim()}
                  className="w-full font-bold gap-2 shadow-sm"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Create & Post Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
