import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Landmark,
  Download,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  RefreshCw,
  Eye,
  Key,
  Ban,
  Check,
  Building,
} from "lucide-react";
import { toast } from "sonner";

interface BankDisbursementWorkspaceProps {
  runs: any[];
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function BankDisbursementWorkspace({ runs }: BankDisbursementWorkspaceProps) {
  const qc = useQueryClient();

  // Create Batch Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<"ICICI" | "HDFC" | "SBI">("ICICI");
  const [debitAccountNumber, setDebitAccountNumber] = useState<string>("");
  const [clientCode, setClientCode] = useState<string>("");
  const [narration, setNarration] = useState<string>("Monthly Salary Disbursement");

  // Batch Detail Drawer / Modal
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Digital Signature Modal
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signingBatch, setSigningBatch] = useState<any | null>(null);
  const [signerName, setSignerName] = useState<string>("");

  // Reconcile / Disburse Modal
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [disbursingBatch, setDisbursingBatch] = useState<any | null>(null);
  const [bankReference, setBankReference] = useState<string>("");

  // Query Disbursement Batches
  const { data: batches = [], isLoading: isLoadingBatches, refetch: refetchBatches } = useQuery({
    queryKey: ["bank-disbursement-batches"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll/disbursement/batches");
        return Array.isArray(res) ? res : [];
      } catch (err: any) {
        toast.error("Failed to load disbursement batches: " + (err.message || "Unknown error"));
        return [];
      }
    },
  });

  // Query Specific Batch Items
  const { data: batchDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["bank-disbursement-batch-detail", selectedBatch?.id],
    queryFn: async () => {
      if (!selectedBatch?.id) return null;
      try {
        const res = await api.get(`/payroll/disbursement/batches/${selectedBatch.id}`);
        return res;
      } catch (err: any) {
        toast.error("Failed to load batch items: " + (err.message || "Unknown error"));
        return null;
      }
    },
    enabled: !!selectedBatch?.id,
  });

  // Mutation: Create Batch
  const createBatchMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRunId) throw new Error("Please select a finalized payroll run.");
      if (!debitAccountNumber.trim()) throw new Error("Debit corporate account number is required.");

      return await api.post("/payroll/disbursement/batches", {
        payrollRunId: selectedRunId,
        bankCode: selectedBank,
        debitAccountNumber: debitAccountNumber.trim(),
        clientCode: clientCode.trim() || undefined,
        narration: narration.trim() || undefined,
      });
    },
    onSuccess: (data: any) => {
      toast.success(
        `Disbursement batch ${data.batch.batchReference} created with ${data.eligibleCount} beneficiaries!`
      );
      setIsCreateModalOpen(false);
      setSelectedRunId("");
      setDebitAccountNumber("");
      qc.invalidateQueries({ queryKey: ["bank-disbursement-batches"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create disbursement batch.");
    },
  });

  // Mutation: Approve Batch
  const approveBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return await api.post(`/payroll/disbursement/batches/${batchId}/approve`, {});
    },
    onSuccess: () => {
      toast.success("Disbursement batch approved for bank payout export!");
      qc.invalidateQueries({ queryKey: ["bank-disbursement-batches"] });
      if (selectedBatch) {
        setSelectedBatch((prev: any) => ({ ...prev, status: "approved" }));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve batch.");
    },
  });

  // Mutation: Generate Payout File
  const generateFileMutation = useMutation({
    mutationFn: async ({ batchId, digitallySign, signer }: { batchId: string; digitallySign: boolean; signer?: string }) => {
      return await api.post(`/payroll/disbursement/batches/${batchId}/generate`, {
        digitallySign,
        signerName: signer || undefined,
      });
    },
    onSuccess: (data: any) => {
      toast.success(
        `Payout file generated: ${data.fileName} ${data.isDigitallySigned ? "(Digitally Signed)" : ""}`
      );
      setIsSignModalOpen(false);
      qc.invalidateQueries({ queryKey: ["bank-disbursement-batches"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate bank payout file.");
    },
  });

  // Mutation: Disburse Batch
  const disburseMutation = useMutation({
    mutationFn: async ({ batchId, bankRef }: { batchId: string; bankRef?: string }) => {
      return await api.post(`/payroll/disbursement/batches/${batchId}/disburse`, {
        bankReference: bankRef || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Batch successfully marked as Disbursed. Beneficiary payouts confirmed!");
      setIsDisburseModalOpen(false);
      setBankReference("");
      qc.invalidateQueries({ queryKey: ["bank-disbursement-batches"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to mark batch as disbursed.");
    },
  });

  // Helper to trigger file download
  const downloadFile = (batchId: string, fileName: string) => {
    const token = localStorage.getItem("token");
    const downloadUrl = `${API_BASE}/payroll/disbursement/batches/${batchId}/download${token ? `?token=${token}` : ""}`;
    window.open(downloadUrl, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><Clock className="size-3" /> Draft</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1"><Check className="size-3" /> Approved</Badge>;
      case "generated":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1"><FileText className="size-3" /> File Generated</Badge>;
      case "disbursed":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="size-3" /> Disbursed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1"><Ban className="size-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Eligible runs: Approved or Finalized
  const eligibleRuns = runs.filter(
    (r) => ["approved", "finalized", "calculated", "completed"].includes(r.approval_status) || r.status === "completed"
  );

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Batches</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{batches.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Corporate payout batches</p>
            </div>
            <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
              <Landmark className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Disbursed Volume</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {fmtCurrency(
                  batches
                    .filter((b: any) => b.status === "disbursed")
                    .reduce((acc: number, b: any) => acc + Number(b.totalDisbursementAmount || 0), 0)
                )}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Zero double-payment audited</p>
            </div>
            <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Supported Corporate Banks</p>
              <h3 className="text-xl font-bold text-foreground mt-1">ICICI • HDFC • SBI</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">CIB, Enet & CMP Adapters</p>
            </div>
            <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
              <Building className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Digital Signatures</p>
              <h3 className="text-xl font-bold text-foreground mt-1">PKCS#7 / SHA-256</h3>
              <p className="text-[11px] text-indigo-600 font-medium mt-0.5">Detached signature verification</p>
            </div>
            <div className="size-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-2xs">
        <CardHeader className="py-3 px-4 border-b bg-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Landmark className="size-4 text-primary" />
                Bank Disbursement Console
              </CardTitle>
              <CardDescription className="text-xs">
                Create, approve, digitally sign, and download bank-specific salary payout files.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => refetchBatches()}
                disabled={isLoadingBatches}
              >
                <RefreshCw className={`size-3.5 ${isLoadingBatches ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="size-3.5" />
                New Disbursement Batch
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs bg-muted/40">
                <TableHead className="font-semibold">Batch Reference</TableHead>
                <TableHead className="font-semibold">Corporate Bank</TableHead>
                <TableHead className="font-semibold">Payroll Period</TableHead>
                <TableHead className="font-semibold text-center">Beneficiaries</TableHead>
                <TableHead className="font-semibold text-right">Total Net Payout</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="font-semibold text-center">Signed</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingBatches ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading corporate disbursement batches...
                  </TableCell>
                </TableRow>
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                    No disbursement batches found. Click "New Disbursement Batch" to start an automated salary payout.
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((b: any) => (
                  <TableRow key={b.id} className="text-xs hover:bg-muted/30">
                    <TableCell className="font-mono font-medium">{b.batchReference}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-semibold">
                        {b.bankCode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {b.payrollRun ? `${b.payrollRun.periodMonth}/${b.payrollRun.periodYear}` : "—"}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{b.totalBeneficiaries}</TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {fmtCurrency(Number(b.totalDisbursementAmount || 0))}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(b.status)}</TableCell>
                    <TableCell className="text-center">
                      {b.isDigitallySigned ? (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 text-[10px]">
                          <ShieldCheck className="size-3" /> Signed
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          title="View Batch Details & Masked Beneficiaries"
                          onClick={() => {
                            setSelectedBatch(b);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <Eye className="size-3.5" />
                        </Button>

                        {b.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 gap-1 text-blue-600 hover:text-blue-700 border-blue-200"
                            onClick={() => approveBatchMutation.mutate(b.id)}
                            disabled={approveBatchMutation.isPending}
                          >
                            <Check className="size-3" /> Approve
                          </Button>
                        )}

                        {["approved", "generated"].includes(b.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 gap-1 text-purple-600 hover:text-purple-700 border-purple-200"
                            onClick={() => {
                              setSigningBatch(b);
                              setIsSignModalOpen(true);
                            }}
                          >
                            <Key className="size-3" /> Generate / Sign
                          </Button>
                        )}

                        {b.status === "generated" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1 text-emerald-600 hover:text-emerald-700 border-emerald-200"
                              onClick={() => downloadFile(b.id, b.batchReference)}
                            >
                              <Download className="size-3" /> Download
                            </Button>

                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              onClick={() => {
                                setDisbursingBatch(b);
                                setIsDisburseModalOpen(true);
                              }}
                            >
                              <CheckCircle2 className="size-3" /> Disburse
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOG 1: Create Disbursement Batch */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Landmark className="size-4 text-primary" />
              Create Corporate Bank Payout Batch
            </DialogTitle>
            <DialogDescription className="text-xs">
              Prepare net salary disbursements for eligible employees. Validates IFSC, bank accounts, and prevents duplicate disbursements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Finalized Payroll Run</Label>
              <Select value={selectedRunId} onValueChange={setSelectedRunId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose an approved payroll run..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleRuns.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No approved or finalized payroll runs found
                    </SelectItem>
                  ) : (
                    eligibleRuns.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        {r.period_month}/{r.period_year} — {fmtCurrency(r.total_net)} ({r.payslips_count} payslips) [{r.approval_status}]
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Corporate Bank Adapter</Label>
                <Select value={selectedBank} onValueChange={(v: any) => setSelectedBank(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ICICI" className="text-xs">ICICI Bank (CIB Caret Format)</SelectItem>
                    <SelectItem value="HDFC" className="text-xs">HDFC Bank (Enet 11-Col CSV)</SelectItem>
                    <SelectItem value="SBI" className="text-xs">State Bank of India (CMP Flat File)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Debit Corporate Account</Label>
                <Input
                  className="h-9 text-xs font-mono"
                  placeholder="e.g. 000901552345"
                  value={debitAccountNumber}
                  onChange={(e) => setDebitAccountNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Client / Corporate Code (Optional)</Label>
                <Input
                  className="h-9 text-xs font-mono"
                  placeholder="e.g. CORP12345"
                  value={clientCode}
                  onChange={(e) => setClientCode(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Transaction Narration</Label>
                <Input
                  className="h-9 text-xs"
                  placeholder="e.g. Monthly Salary Disbursement"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <ShieldCheck className="size-4 shrink-0 mt-0.5" />
              <div>
                <strong>Double-Payment Guard:</strong> Only employees with positive net pay who are not part of an active/disbursed batch will be included. Bank account numbers are encrypted and masked for UI privacy.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createBatchMutation.mutate()}
              disabled={createBatchMutation.isPending || !selectedRunId || !debitAccountNumber.trim()}
            >
              {createBatchMutation.isPending ? "Creating Batch..." : "Create Payout Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Batch Details & Beneficiaries */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Eye className="size-4 text-primary" />
              Disbursement Batch: {selectedBatch?.batchReference}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit beneficiary records, IFSC routing codes, and masked bank accounts before payout execution.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
              Loading batch items...
            </div>
          ) : batchDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Debit Corporate Account</span>
                  <span className="font-mono font-semibold">{batchDetail.batch.debitAccountNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Beneficiaries</span>
                  <span className="font-semibold">{batchDetail.batch.totalBeneficiaries} employees</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Disbursement</span>
                  <span className="font-bold text-foreground">{fmtCurrency(Number(batchDetail.batch.totalDisbursementAmount))}</span>
                </div>
              </div>

              {batchDetail.batch.isDigitallySigned && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold">
                    <ShieldCheck className="size-4" /> PKCS#7 Detached Digital Signature Verified
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    Signer: {batchDetail.batch.signerIdentity} • Timestamp: {new Date(batchDetail.batch.signedAt).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                    SHA-256 Digest: {batchDetail.batch.fileHash}
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs bg-muted/40">
                      <TableHead className="font-semibold">Emp Code</TableHead>
                      <TableHead className="font-semibold">Beneficiary Name</TableHead>
                      <TableHead className="font-semibold">Masked Account</TableHead>
                      <TableHead className="font-semibold">IFSC Code</TableHead>
                      <TableHead className="font-semibold">Mode</TableHead>
                      <TableHead className="font-semibold text-right">Net Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchDetail.items.map((item: any) => (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="font-mono font-medium">{item.employee?.employeeCode || "—"}</TableCell>
                        <TableCell className="font-medium">{item.beneficiaryName}</TableCell>
                        <TableCell className="font-mono">{item.accountNumber}</TableCell>
                        <TableCell className="font-mono">{item.ifscCode}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{item.paymentMode}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">{fmtCurrency(Number(item.amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button size="sm" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Digital Signing & File Generation */}
      <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Key className="size-4 text-purple-600" />
              Generate Payout File & Digital Signature
            </DialogTitle>
            <DialogDescription className="text-xs">
              Generate the bank-formatted transmission file and optionally attach a detached PKCS#7 RSA-SHA256 signature for bank compliance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <div><strong>Batch:</strong> <span className="font-mono">{signingBatch?.batchReference}</span></div>
              <div><strong>Bank Format:</strong> {signingBatch?.bankCode} Adapter</div>
              <div><strong>Beneficiaries:</strong> {signingBatch?.totalBeneficiaries} employees</div>
              <div><strong>Total Net Pay:</strong> {fmtCurrency(Number(signingBatch?.totalDisbursementAmount || 0))}</div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Authorized Signatory Name</Label>
              <Input
                className="h-9 text-xs"
                placeholder="e.g. CFO / Authorized Finance Signatory"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Embedded in the audit metadata and signed manifest for corporate bank compliance.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (signingBatch) {
                  generateFileMutation.mutate({ batchId: signingBatch.id, digitallySign: false });
                }
              }}
              disabled={generateFileMutation.isPending}
            >
              Generate Unsigned File
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5"
              onClick={() => {
                if (signingBatch) {
                  generateFileMutation.mutate({
                    batchId: signingBatch.id,
                    digitallySign: true,
                    signer: signerName.trim() || "CFO / Finance Director",
                  });
                }
              }}
              disabled={generateFileMutation.isPending}
            >
              <ShieldCheck className="size-3.5" />
              Generate & Digitally Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Disburse Batch */}
      <Dialog open={isDisburseModalOpen} onOpenChange={setIsDisburseModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Finalize Payout Disbursement
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm that the file was processed by the bank. This locks the batch into disbursed status and records final reconciliation timestamps.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bank UTR / Reference Number (Optional)</Label>
              <Input
                className="h-9 text-xs font-mono"
                placeholder="e.g. CMS20261001099234"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
              />
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                Once marked as disbursed, the included employee payslips cannot be re-added to any new payout batch, guaranteeing absolute protection against duplicate payroll payments.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDisburseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={() => {
                if (disbursingBatch) {
                  disburseMutation.mutate({ batchId: disbursingBatch.id, bankRef: bankReference.trim() });
                }
              }}
              disabled={disburseMutation.isPending}
            >
              Confirm Disbursement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
