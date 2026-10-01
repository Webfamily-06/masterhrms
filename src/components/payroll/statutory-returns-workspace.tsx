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
  ShieldCheck,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Users,
  Award,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

interface StatutoryReturnsWorkspaceProps {
  runs: any[];
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function StatutoryReturnsWorkspace({ runs }: StatutoryReturnsWorkspaceProps) {
  const qc = useQueryClient();

  // Generate Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [returnType, setReturnType] = useState<"EPF_ECR" | "ESIC_MONTHLY">("EPF_ECR");
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [esicFormat, setEsicFormat] = useState<"xlsx" | "csv">("xlsx");

  // TRRN Record Modal State
  const [isTrrnModalOpen, setIsTrrnModalOpen] = useState(false);
  const [selectedFiling, setSelectedFiling] = useState<any | null>(null);
  const [challanTrrn, setChallanTrrn] = useState<string>("");

  // Query Statutory Filings
  const { data: filings = [], isLoading: isLoadingFilings, refetch: refetchFilings } = useQuery({
    queryKey: ["statutory-filings"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll/statutory/filings");
        return Array.isArray(res) ? res : [];
      } catch (err: any) {
        toast.error("Failed to load statutory filings: " + (err.message || "Unknown error"));
        return [];
      }
    },
  });

  // Mutation: Generate Return
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRunId) throw new Error("Please select a finalized payroll run.");

      if (returnType === "EPF_ECR") {
        return await api.post("/payroll/statutory/ecr/generate", {
          payrollRunId: selectedRunId,
        });
      } else {
        return await api.post("/payroll/statutory/esic/generate", {
          payrollRunId: selectedRunId,
          format: esicFormat,
        });
      }
    },
    onSuccess: (data: any) => {
      toast.success(
        `${returnType === "EPF_ECR" ? "EPF ECR 2.0" : "ESIC Return"} generated successfully: ${data.fileName}`
      );
      setIsGenerateModalOpen(false);
      setSelectedRunId("");
      qc.invalidateQueries({ queryKey: ["statutory-filings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Statutory return generation failed.");
    },
  });

  // Mutation: Record Challan TRRN
  const updateTrrnMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFiling?.id) return;
      if (!challanTrrn.trim()) throw new Error("Challan TRRN or Reference is required.");

      return await api.post(`/payroll/statutory/filings/${selectedFiling.id}/trrn`, {
        challanTrrn: challanTrrn.trim(),
        status: "paid",
      });
    },
    onSuccess: () => {
      toast.success("Challan TRRN / Payment Reference recorded successfully!");
      setIsTrrnModalOpen(false);
      setChallanTrrn("");
      qc.invalidateQueries({ queryKey: ["statutory-filings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record Challan TRRN.");
    },
  });

  // Download Return File
  const downloadReturn = (filingId: string) => {
    const token = localStorage.getItem("token");
    const downloadUrl = `${API_BASE}/payroll/statutory/filings/${filingId}/download${token ? `?token=${token}` : ""}`;
    window.open(downloadUrl, "_blank");
  };

  const eligibleRuns = runs.filter(
    (r) => ["approved", "finalized", "calculated", "completed"].includes(r.approval_status) || r.status === "completed"
  );

  return (
    <div className="space-y-6">
      {/* Statutory Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* EPFO Card */}
        <Card className="border shadow-2xs bg-gradient-to-br from-card to-blue-50/20 dark:to-blue-950/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">EPFO Unified Portal</Badge>
              <Building2 className="size-4 text-blue-600" />
            </div>
            <CardTitle className="text-base font-bold mt-2">Electronic Challan Return (ECR 2.0)</CardTitle>
            <CardDescription className="text-xs">
              Official 11-column <code>#~#</code> delimited format with Para 8(3) EPS 1995 Age 58 wage cutoff automation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t">
              <span className="text-muted-foreground font-mono">Rate: 12% EE | 8.33% EPS</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={() => {
                  setReturnType("EPF_ECR");
                  setIsGenerateModalOpen(true);
                }}
              >
                <Plus className="size-3.5 mr-1" /> Generate ECR
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ESIC Card */}
        <Card className="border shadow-2xs bg-gradient-to-br from-card to-emerald-50/20 dark:to-emerald-950/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">ESIC Portal</Badge>
              <ShieldCheck className="size-4 text-emerald-600" />
            </div>
            <CardTitle className="text-base font-bold mt-2">Monthly Contribution Return</CardTitle>
            <CardDescription className="text-xs">
              Portal-compliant Excel (<code>.xlsx</code>) & CSV returns. Computes 0.75% EE & 3.25% ER shares with ₹21,000 wage ceiling rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t">
              <span className="text-muted-foreground font-mono">Ceiling: ₹21,000 / month</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  setReturnType("ESIC_MONTHLY");
                  setIsGenerateModalOpen(true);
                }}
              >
                <Plus className="size-3.5 mr-1" /> Generate ESIC
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Summary */}
        <Card className="border shadow-2xs bg-gradient-to-br from-card to-purple-50/20 dark:to-purple-950/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Audit & Control</Badge>
              <Award className="size-4 text-purple-600" />
            </div>
            <CardTitle className="text-base font-bold mt-2">Statutory Audit Trail</CardTitle>
            <CardDescription className="text-xs">
              Deterministic file hash generation, SHA-256 integrity digests, and Challan TRRN reconciliation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t">
              <span className="text-muted-foreground font-mono">Filings Tracked: {filings.length}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => refetchFilings()}
              >
                <RefreshCw className="size-3 mr-1" /> Sync Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statutory Filings History Table */}
      <Card className="border shadow-2xs">
        <CardHeader className="py-3 px-4 border-b bg-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-primary" />
                Statutory Return Filings History
              </CardTitle>
              <CardDescription className="text-xs">
                Archived return files, Challan TRRN numbers, and government portal upload manifests.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs bg-muted/40">
                <TableHead className="font-semibold">Return Type</TableHead>
                <TableHead className="font-semibold">Wage Month / Year</TableHead>
                <TableHead className="font-semibold text-center">Subscribed Members</TableHead>
                <TableHead className="font-semibold text-right">Reported Wages</TableHead>
                <TableHead className="font-semibold text-right">EE Share</TableHead>
                <TableHead className="font-semibold text-right">ER Share</TableHead>
                <TableHead className="font-semibold text-right">Challan Total</TableHead>
                <TableHead className="font-semibold text-center">TRRN / Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingFilings ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading statutory filings history...
                  </TableCell>
                </TableRow>
              ) : filings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                    No statutory returns generated yet. Click "Generate ECR" or "Generate ESIC" above to create official portal return files.
                  </TableCell>
                </TableRow>
              ) : (
                filings.map((f: any) => (
                  <TableRow key={f.id} className="text-xs hover:bg-muted/30">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          f.returnType === "EPF_ECR"
                            ? "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                        }
                      >
                        {f.returnType === "EPF_ECR" ? "EPF ECR 2.0" : "ESIC Return"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {f.wageMonth}/{f.wageYear}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{f.totalMembers}</TableCell>
                    <TableCell className="text-right font-mono">{fmtCurrency(Number(f.totalWages))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{fmtCurrency(Number(f.totalEmployeeShare))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{fmtCurrency(Number(f.totalEmployerShare))}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">
                      {fmtCurrency(Number(f.totalChallanAmount))}
                    </TableCell>
                    <TableCell className="text-center">
                      {f.challanTrrn ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">
                          TRRN: {f.challanTrrn}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                          Pending Payment
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2 gap-1 text-primary hover:text-primary border-primary/20"
                          onClick={() => downloadReturn(f.id)}
                          title="Download Portal Return File"
                        >
                          <Download className="size-3" /> Download ({f.fileFormat?.toUpperCase()})
                        </Button>

                        {!f.challanTrrn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedFiling(f);
                              setIsTrrnModalOpen(true);
                            }}
                          >
                            Record TRRN
                          </Button>
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

      {/* DIALOG 1: Generate Statutory Return */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Generate {returnType === "EPF_ECR" ? "EPF ECR 2.0 Return" : "ESIC Monthly Return"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Extract verified payroll contribution figures and generate government portal-ready return files.
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
                        {r.period_month}/{r.period_year} — {fmtCurrency(r.total_net)} ({r.payslips_count} payslips)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {returnType === "ESIC_MONTHLY" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Export File Format</Label>
                <Select value={esicFormat} onValueChange={(v: any) => setEsicFormat(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx" className="text-xs">Microsoft Excel (.xlsx) — Portal Template</SelectItem>
                    <SelectItem value="csv" className="text-xs">Comma Separated Values (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" />
                Statutory Compliance Notes:
              </div>
              {returnType === "EPF_ECR" ? (
                <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-1">
                  <li>Validates 12-digit UAN identifiers for all contributing employees.</li>
                  <li>Automatically excludes EPS contributions (sets EPS Wages to 0) for employees aged 58 and above pursuant to Para 8(3) EPS 1995.</li>
                  <li>Generates standard 11-column <code>#~#</code> delimited format.</li>
                </ul>
              ) : (
                <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-1">
                  <li>Validates 10 to 17-digit Insurance Person (IP) numbers.</li>
                  <li>Reconciles 0.75% Employee and 3.25% Employer contribution shares.</li>
                  <li>Populates reason codes (01 for LOP, 02 for Left Service) when payable days are 0.</li>
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsGenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !selectedRunId}
            >
              {generateMutation.isPending ? "Generating File..." : "Generate Portal File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Record Challan TRRN */}
      <Dialog open={isTrrnModalOpen} onOpenChange={setIsTrrnModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Hash className="size-4 text-emerald-600" />
              Record Government Challan TRRN
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter the Temporary Return Reference Number (TRRN) or Challan Reference provided by the EPFO/ESIC portal after payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <div><strong>Return:</strong> {selectedFiling?.returnType}</div>
              <div><strong>Period:</strong> {selectedFiling?.wageMonth}/{selectedFiling?.wageYear}</div>
              <div><strong>Challan Amount:</strong> {fmtCurrency(Number(selectedFiling?.totalChallanAmount || 0))}</div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Challan TRRN / ECR Receipt No.</Label>
              <Input
                className="h-9 text-xs font-mono"
                placeholder="e.g. 1012609012345"
                value={challanTrrn}
                onChange={(e) => setChallanTrrn(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsTrrnModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={() => updateTrrnMutation.mutate()}
              disabled={updateTrrnMutation.isPending || !challanTrrn.trim()}
            >
              Save TRRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
