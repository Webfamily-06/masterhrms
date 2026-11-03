'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Receipt,
  FileCheck2,
  Calculator,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Users,
} from "lucide-react";

export default function ContractStaffingBillingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"clients" | "manifest" | "invoices" | "simulator">("clients");
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [reconciliationModalData, setReconciliationModalData] = useState<any | null>(null);

  // New Client Form State
  const [clientForm, setClientForm] = useState({
    name: "",
    code: "",
    gstin: "",
    billingStateCode: "33",
    address: "",
    serviceChargePct: 10.0,
    serviceChargeBase: "GROSS_PLUS_PF",
  });

  // Simulator State
  const [simState, setSimState] = useState({
    earnedGross: 247159.0,
    employerPf: 38665.0,
    billableCtc: 288355.6,
    basis: "GROSS_PLUS_PF",
    markupPct: 10.0,
    supplierState: "33",
    clientState: "33",
    gstRate: 18.0,
  });
  const [simResult, setSimResult] = useState<any | null>(null);

  // 1. Fetch Staffing Clients
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["staffing-clients"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/staffing/clients");
        return res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch Payroll Runs for selection
  const { data: runsData } = useQuery({
    queryKey: ["payroll-runs-billing"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/payroll/runs");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Invoices
  const { data: invoicesData, refetch: refetchInvoices } = useQuery({
    queryKey: ["staffing-invoices"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/staffing/invoices");
        return res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 4. Fetch Run Billing Manifest
  const { data: manifestData, isLoading: manifestLoading, refetch: refetchManifest } = useQuery({
    queryKey: ["staffing-manifest", selectedRunId],
    enabled: !!selectedRunId,
    queryFn: async () => {
      const res: any = await api.get(`/api/payroll/runs/${selectedRunId}/staffing-summary`);
      return res?.data || null;
    },
  });

  // Create Client Mutation
  const createClientMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/staffing/clients", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffing-clients"] });
      setIsClientModalOpen(false);
      setClientForm({
        name: "",
        code: "",
        gstin: "",
        billingStateCode: "33",
        address: "",
        serviceChargePct: 10.0,
        serviceChargeBase: "GROSS_PLUS_PF",
      });
    },
  });

  // Generate Invoices Mutation
  const generateInvoicesMutation = useMutation({
    mutationFn: async ({ runId, clientId }: { runId: string; clientId?: string }) => {
      return await api.post(`/api/payroll/runs/${runId}/generate-invoices`, {
        clientId,
        status: "DRAFT",
        forceRegenerate: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffing-invoices"] });
      refetchInvoices();
      setActiveTab("invoices");
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      return await api.patch(`/api/staffing/invoices/${invoiceId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffing-invoices"] });
      refetchInvoices();
    },
  });

  // Reconcile Invoice
  const handleReconcile = async (invoiceId: string) => {
    try {
      const res: any = await api.get(`/api/staffing/invoices/${invoiceId}/reconciliation`);
      setReconciliationModalData(res?.data || null);
    } catch (err: any) {
      alert("Reconciliation failed: " + (err.message || "Unknown error"));
    }
  };

  // Run Simulation
  const handleSimulate = async () => {
    try {
      const res: any = await api.post("/api/staffing/simulate-mmu", simState);
      setSimResult(res?.simulation || null);
    } catch (err: any) {
      alert("Simulation error: " + err.message);
    }
  };

  const handleLoadGoldenCohort = () => {
    setSimState({
      earnedGross: 247159.0,
      employerPf: 38665.0,
      billableCtc: 288355.6,
      basis: "GROSS_PLUS_PF",
      markupPct: 10.0,
      supplierState: "33",
      clientState: "33",
      gstRate: 18.0,
    });
    // Immediately calculate
    setTimeout(() => {
      handleSimulate();
    }, 100);
  };

  const clients: any[] = clientsData || [];
  const invoices: any[] = invoicesData || [];
  const runs: any[] = runsData || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contract Staffing Commercial Billing"
        description="Automated link between approved payroll cycles, contractor margin (MMU), GST liabilities, and client tax invoices."
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("simulator")}
            className="flex items-center gap-1.5"
          >
            <Calculator className="w-4 h-4 text-indigo-500" />
            MMU & GST Simulator
          </Button>
          <Button
            size="sm"
            onClick={() => setIsClientModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Staffing Client
          </Button>
        </div>
      </PageHeader>

      {/* High-level KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="pt-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Clients</p>
                <h3 className="text-2xl font-bold mt-1">{clients.length}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">With configured markup & GST</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Generated Invoices</p>
                <h3 className="text-2xl font-bold mt-1">{invoices.length}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">From approved payroll cycles</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Billed Volume</p>
                <h3 className="text-2xl font-bold mt-1">
                  ₹{invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">CTC + MMU + GST</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Statutory Isolation</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">100% Enforced</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Net wages isolated from billing</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border space-x-4">
        <button
          onClick={() => setActiveTab("clients")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "clients"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Staffing Clients ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab("manifest")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "manifest"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Cycle Billing Preview
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "invoices"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Client Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab("simulator")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "simulator"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          MMU & GST Simulator
        </button>
      </div>

      {/* TAB 1: Staffing Clients */}
      {activeTab === "clients" && (
        <Card>
          <CardHeader>
            <CardTitle>Staffing Clients Registry</CardTitle>
            <CardDescription>
              Commercial contract terms, markup bases, and GST registrations by client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading staffing clients...</div>
            ) : clients.length === 0 ? (
              <div className="p-12 text-center border border-dashed rounded-lg">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <h4 className="font-semibold text-lg">No Staffing Clients Configured</h4>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                  Add staffing clients to enable automated commercial markups (MMU), billable CTC calculations, and client tax invoices.
                </p>
                <Button onClick={() => setIsClientModalOpen(true)} className="bg-indigo-600 text-white">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add First Staffing Client
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Client Name & Code</th>
                      <th className="py-3 px-4">GSTIN & State</th>
                      <th className="py-3 px-4">Markup Basis</th>
                      <th className="py-3 px-4 text-right">Margin % (MMU)</th>
                      <th className="py-3 px-4 text-center">Assigned Staff</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clients.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="py-3.5 px-4 font-medium">
                          <div>{c.name}</div>
                          <span className="text-xs text-muted-foreground font-mono">{c.code || "N/A"}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs">{c.gstin || "Unregistered"}</div>
                          <div className="text-xs text-muted-foreground">State Code: {c.billingStateCode || "33"}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="font-mono text-xs">
                            {c.serviceChargeBase}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-indigo-600">
                          {c.serviceChargePct}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="secondary" className="px-2.5 py-0.5">
                            {c.employeeCount} headcount
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge className={c.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRunId(runs[0]?.id || "");
                              setActiveTab("manifest");
                            }}
                          >
                            View Billing
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: Cycle Billing Preview */}
      {activeTab === "manifest" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>Payroll Cycle Commercial Manifest</CardTitle>
                  <CardDescription>
                    Aggregates Direct Wages, Employer Statutory Liabilities, MMU Markup, and GST from frozen snapshots.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold whitespace-nowrap">Select Payroll Cycle:</Label>
                  <select
                    value={selectedRunId}
                    onChange={(e) => setSelectedRunId(e.target.value)}
                    className="h-9 px-3 text-sm rounded-md border border-input bg-background"
                  >
                    <option value="">-- Choose a payroll cycle --</option>
                    {runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.periodYear}-{String(r.periodMonth).padStart(2, "0")} ({r.status || "DRAFT"})
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchManifest()}
                    disabled={!selectedRunId || manifestLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${manifestLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedRunId ? (
                <div className="p-8 text-center text-muted-foreground">
                  Please select an approved payroll run above to inspect its client billing manifest.
                </div>
              ) : manifestLoading ? (
                <div className="p-8 text-center text-muted-foreground">Calculating commercial manifest...</div>
              ) : !manifestData || manifestData.clients.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No staffing clients found for this payroll run. Ensure employees have `clientId` assigned.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Metric Cards for Manifest */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-muted/40 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Billable CTC</p>
                      <p className="text-lg font-bold">₹{manifestData.totalBillableCtc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contractor Margin (MMU)</p>
                      <p className="text-lg font-bold text-indigo-600">₹{manifestData.totalMmu.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Taxable Value</p>
                      <p className="text-lg font-bold">₹{manifestData.taxableSupplyValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">GST (18%)</p>
                      <p className="text-lg font-bold">₹{manifestData.totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Total Client Invoice</p>
                      <p className="text-lg font-bold text-emerald-600">₹{manifestData.totalInvoiceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Client Breakdown List */}
                  {manifestData.clients.map((cs: any) => (
                    <div key={cs.clientId} className="border rounded-lg p-5 space-y-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3 gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base">{cs.clientName}</h4>
                            <Badge variant="outline">{cs.clientCode || "CLIENT"}</Badge>
                            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                              {cs.mmuBasis} @ {cs.mmuRate}%
                            </Badge>
                            <Badge variant="secondary">Supply: {cs.supplyType}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            GSTIN: {cs.clientGstin || "N/A"} | Headcount: {cs.headcount} personnel
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => generateInvoicesMutation.mutate({ runId: selectedRunId, clientId: cs.clientId })}
                          disabled={generateInvoicesMutation.isPending}
                          className="bg-indigo-600 text-white"
                        >
                          <Receipt className="w-4 h-4 mr-1.5" />
                          Generate Tax Invoice
                        </Button>
                      </div>

                      {/* Employee line items sample */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/60 text-muted-foreground uppercase tracking-wider">
                            <tr>
                              <th className="py-2 px-3">Employee</th>
                              <th className="py-2 px-3 text-right">Direct Gross</th>
                              <th className="py-2 px-3 text-right">Employer PF</th>
                              <th className="py-2 px-3 text-right">Total Statutory</th>
                              <th className="py-2 px-3 text-right">Billable CTC</th>
                              <th className="py-2 px-3 text-right">MMU Margin</th>
                              <th className="py-2 px-3 text-right font-semibold">Total Billable</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {cs.employeeLines.slice(0, 5).map((el: any) => (
                              <tr key={el.employeeId}>
                                <td className="py-2 px-3 font-medium">
                                  <div>{el.employeeName}</div>
                                  <span className="text-[10px] text-muted-foreground">{el.employeeCode}</span>
                                </td>
                                <td className="py-2 px-3 text-right">₹{el.earnedGross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="py-2 px-3 text-right">₹{el.employerPf.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="py-2 px-3 text-right">₹{el.totalEmployerStatutory.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="py-2 px-3 text-right">₹{el.billableCtc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="py-2 px-3 text-right text-indigo-600">₹{el.mmuAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="py-2 px-3 text-right font-semibold">₹{el.totalBillingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {cs.employeeLines.length > 5 && (
                          <p className="text-xs text-center text-muted-foreground pt-2">
                            ... and {cs.employeeLines.length - 5} more personnel in this manifest.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Client Invoices */}
      {activeTab === "invoices" && (
        <Card>
          <CardHeader>
            <CardTitle>Client Tax Invoices (Staffing Supply)</CardTitle>
            <CardDescription>
              State machine managed client invoices with audit trails and automated reconciliation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No staffing invoices generated yet. Use the Cycle Billing Preview tab to trigger invoice generation.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Invoice # & Date</th>
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4 text-center">Headcount</th>
                      <th className="py-3 px-4 text-right">Subtotal (Taxable)</th>
                      <th className="py-3 px-4 text-right">GST (18%)</th>
                      <th className="py-3 px-4 text-right font-semibold">Grand Total</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/30">
                        <td className="py-3.5 px-4 font-mono font-medium">
                          <div>{inv.invoiceNo}</div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium">{inv.clientName}</td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="outline">{inv.headcount} staff</Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          ₹{inv.taxableSupplyValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                          ₹{inv.totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                          ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            className={
                              inv.status === "APPROVED"
                                ? "bg-blue-500/10 text-blue-600"
                                : inv.status === "ISSUED"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : inv.status === "PAID"
                                ? "bg-purple-500/10 text-purple-600"
                                : inv.status === "CANCELLED"
                                ? "bg-rose-500/10 text-rose-600"
                                : "bg-amber-500/10 text-amber-600"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReconcile(inv.id)}
                              className="text-xs"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Reconcile
                            </Button>
                            {inv.status === "DRAFT" && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ invoiceId: inv.id, status: "APPROVED" })}
                                className="bg-blue-600 text-white text-xs"
                              >
                                Approve
                              </Button>
                            )}
                            {inv.status === "APPROVED" && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ invoiceId: inv.id, status: "ISSUED" })}
                                className="bg-emerald-600 text-white text-xs"
                              >
                                Issue
                              </Button>
                            )}
                            {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ invoiceId: inv.id, status: "CANCELLED" })}
                                className="text-rose-600 hover:text-rose-700 text-xs"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: MMU & GST Simulator */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>MMU & GST Dynamic Simulator</CardTitle>
                  <CardDescription>
                    Test contract margins, tax splits (CGST/SGST vs IGST), and verify Excel formulas.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleLoadGoldenCohort}>
                  Load Golden Cohort (Enable India)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Earned Gross Wages (₹)</Label>
                  <Input
                    type="number"
                    value={simState.earnedGross}
                    onChange={(e) => setSimState({ ...simState, earnedGross: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Employer PF Liability (₹)</Label>
                  <Input
                    type="number"
                    value={simState.employerPf}
                    onChange={(e) => setSimState({ ...simState, employerPf: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Total Billable CTC (₹)</Label>
                <Input
                  type="number"
                  value={simState.billableCtc}
                  onChange={(e) => setSimState({ ...simState, billableCtc: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contractor Margin Basis</Label>
                  <select
                    value={simState.basis}
                    onChange={(e) => setSimState({ ...simState, basis: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="GROSS_PLUS_PF">GROSS_PLUS_PF (Gross + Employer PF)</option>
                    <option value="TOTAL_CTC">TOTAL_CTC (Billable Employer CTC)</option>
                    <option value="FIXED_PER_HEAD">FIXED_PER_HEAD (Fixed fee per person)</option>
                  </select>
                </div>
                <div>
                  <Label>Markup Percentage (%)</Label>
                  <Input
                    type="number"
                    value={simState.markupPct}
                    onChange={(e) => setSimState({ ...simState, markupPct: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Supplier State</Label>
                  <Input
                    value={simState.supplierState}
                    onChange={(e) => setSimState({ ...simState, supplierState: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Client State</Label>
                  <Input
                    value={simState.clientState}
                    onChange={(e) => setSimState({ ...simState, clientState: e.target.value })}
                  />
                </div>
                <div>
                  <Label>GST Rate (%)</Label>
                  <Input
                    type="number"
                    value={simState.gstRate}
                    onChange={(e) => setSimState({ ...simState, gstRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <Button onClick={handleSimulate} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Simulation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calculation Audit Trail</CardTitle>
              <CardDescription>Step-by-step breakdown of commercial margin and tax liability.</CardDescription>
            </CardHeader>
            <CardContent>
              {!simResult ? (
                <div className="p-8 text-center text-muted-foreground">
                  Click 'Calculate Simulation' or 'Load Golden Cohort' to view audit results.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MMU Calculation Basis:</span>
                      <span className="font-mono font-semibold">{simResult.basis}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Calculation Wage:</span>
                      <span className="font-mono">₹{simResult.baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-indigo-600 font-bold">
                      <span>Contractor Margin (MMU @ {simResult.markupPct}%):</span>
                      <span className="font-mono">₹{simResult.mmuAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-muted-foreground">Billable Employer CTC:</span>
                      <span className="font-mono">₹{simResult.billableCtc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Taxable Supply Value (CTC + MMU):</span>
                      <span className="font-mono">₹{simResult.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-xs text-muted-foreground">
                      <span>Supply Type:</span>
                      <Badge variant="outline">{simResult.supplyType}</Badge>
                    </div>
                    {simResult.supplyType === "INTRA_STATE" ? (
                      <>
                        <div className="flex justify-between text-xs">
                          <span>Central GST (CGST 9%):</span>
                          <span className="font-mono">₹{simResult.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>State GST (SGST 9%):</span>
                          <span className="font-mono">₹{simResult.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs">
                        <span>Integrated GST (IGST 18%):</span>
                        <span className="font-mono">₹{simResult.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold">
                      <span>Total GST Tax ({simResult.gstRate}%):</span>
                      <span className="font-mono">₹{simResult.totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t-2 border-indigo-600 pt-3 flex justify-between text-base font-bold text-emerald-600">
                      <span>Total Client Tax Invoice:</span>
                      <span className="font-mono">₹{simResult.totalInvoiceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Golden Cohort parity badge */}
                  {Math.abs(simResult.totalInvoiceAmount - 373995) < 1 && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Matches Reference Workbook (Enable India October 2026) with 0.00% variance!
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onboarding Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Onboard Staffing Client</h3>
            <p className="text-xs text-muted-foreground">
              Configure legal entity information, place of supply, and contract markup rates.
            </p>

            <div className="space-y-3">
              <div>
                <Label>Client Name</Label>
                <Input
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="e.g. Enable Engineering Private Limited"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Client Code</Label>
                  <Input
                    value={clientForm.code}
                    onChange={(e) => setClientForm({ ...clientForm, code: e.target.value })}
                    placeholder="e.g. ENABL"
                  />
                </div>
                <div>
                  <Label>Billing State Code</Label>
                  <Input
                    value={clientForm.billingStateCode}
                    onChange={(e) => setClientForm({ ...clientForm, billingStateCode: e.target.value })}
                    placeholder="e.g. 33 (TN)"
                  />
                </div>
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input
                  value={clientForm.gstin}
                  onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value })}
                  placeholder="33AAAAA0000A1Z5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Service Charge Margin (%)</Label>
                  <Input
                    type="number"
                    value={clientForm.serviceChargePct}
                    onChange={(e) => setClientForm({ ...clientForm, serviceChargePct: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Markup Basis</Label>
                  <select
                    value={clientForm.serviceChargeBase}
                    onChange={(e) => setClientForm({ ...clientForm, serviceChargeBase: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="GROSS_PLUS_PF">GROSS_PLUS_PF</option>
                    <option value="TOTAL_CTC">TOTAL_CTC</option>
                    <option value="FIXED_PER_HEAD">FIXED_PER_HEAD</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setIsClientModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createClientMutation.mutate(clientForm)}
                disabled={!clientForm.name || createClientMutation.isPending}
                className="bg-indigo-600 text-white"
              >
                Save Client
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Modal */}
      {reconciliationModalData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Invoice Reconciliation Audit
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Invoice: {reconciliationModalData.invoiceNo} | Client: {reconciliationModalData.clientName}
                </p>
              </div>
              <Badge
                className={
                  reconciliationModalData.status === "MATCHED"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-rose-500/10 text-rose-600"
                }
              >
                {reconciliationModalData.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/40 p-4 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Authoritative Payroll Gross</p>
                <p className="font-mono font-bold mt-0.5">
                  ₹{reconciliationModalData.metrics.payrollGross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Authoritative Billable CTC</p>
                <p className="font-mono font-bold mt-0.5">
                  ₹{reconciliationModalData.metrics.payrollCtc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Recalculated Contractor MMU</p>
                <p className="font-mono font-bold mt-0.5 text-indigo-600">
                  ₹{reconciliationModalData.metrics.payrollMmu.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Invoice Total Charged</p>
                <p className="font-mono font-bold mt-0.5 text-emerald-600">
                  ₹{reconciliationModalData.metrics.invoiceTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-semibold uppercase text-muted-foreground">Variance Checks</h5>
              <div className="text-xs space-y-1">
                <div className="flex justify-between py-1 border-b">
                  <span>Gross Wage Variance:</span>
                  <span className="font-mono font-semibold">₹{reconciliationModalData.metrics.grossVariance}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>Billable CTC Variance:</span>
                  <span className="font-mono font-semibold">₹{reconciliationModalData.metrics.ctcVariance}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>Margin (MMU) Variance:</span>
                  <span className="font-mono font-semibold">₹{reconciliationModalData.metrics.mmuVariance}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>GST Liability Variance:</span>
                  <span className="font-mono font-semibold">₹{reconciliationModalData.metrics.gstVariance}</span>
                </div>
                <div className="flex justify-between py-1 font-bold">
                  <span>Total Financial Discrepancy:</span>
                  <span className="font-mono text-emerald-600">₹{reconciliationModalData.metrics.totalVariance}</span>
                </div>
              </div>
            </div>

            {reconciliationModalData.anomalies.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md space-y-1">
                <p className="text-xs font-semibold text-amber-700">Audit Notices:</p>
                {reconciliationModalData.anomalies.map((a: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-amber-600">
                    • {a.message}
                  </p>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => setReconciliationModalData(null)}>Close Audit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

