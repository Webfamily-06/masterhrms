import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileCheck2,
  Lock,
  Calculator,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Eye,
  Building2,
  Sparkles,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

interface TaxVerificationWorkspaceProps {
  isHR: boolean;
  financialYear?: string;
}

export function TaxVerificationWorkspace({ isHR, financialYear = "2026-2027" }: TaxVerificationWorkspaceProps) {
  const queryClient = useQueryClient();

  const [selectedDeclId, setSelectedDeclId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Calculator inputs
  const [calcGross, setCalcGross] = useState<number>(900000);
  const [calc80C, setCalc80C] = useState<number>(150000);
  const [calc80D, setCalc80D] = useState<number>(25000);
  const [calcHraRent, setCalcHraRent] = useState<number>(180000);
  const [calcHomeLoan, setCalcHomeLoan] = useState<number>(0);
  const [calcComparison, setCalcComparison] = useState<any>(null);

  // 1. Fetch Tax Declarations with proofs
  const { data: declarations = [], isLoading } = useQuery({
    queryKey: ["payroll-tax-declarations", financialYear],
    queryFn: async () => {
      const res: any = await api.get(`/payroll/tax-declarations?financialYear=${financialYear}`);
      return res || [];
    },
  });

  const filteredDeclarations = declarations.filter((d: any) => {
    if (filterStatus === "all") return true;
    return d.status === filterStatus;
  });

  const selectedDeclaration = declarations.find((d: any) => d.id === selectedDeclId) || filteredDeclarations[0];

  // Proof status update mutation
  const updateProofMutation = useMutation({
    mutationFn: async ({
      declId,
      proofId,
      status,
      approvedAmount,
      rejectionReason,
    }: {
      declId: string;
      proofId: string;
      status: string;
      approvedAmount?: number;
      rejectionReason?: string;
    }) => {
      return api.patch(`/payroll/tax-declarations/${declId}/proofs/${proofId}/status`, {
        status,
        approvedAmount,
        rejectionReason,
      });
    },
    onSuccess: () => {
      toast.success("Proof verification updated!");
      queryClient.invalidateQueries({ queryKey: ["payroll-tax-declarations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update proof status");
    },
  });

  // Calculate comparison mutation
  const runComparison = async () => {
    try {
      const res: any = await api.post("/payroll/tax-declarations/compare", {
        annualGrossSalary: calcGross,
        basicSalaryAnnual: calcGross * 0.50,
        hraReceivedAnnual: calcGross * 0.20,
        houseRentPaidAnnual: calcHraRent,
        section80C: calc80C,
        section80D: calc80D,
        homeLoanInterest: calcHomeLoan,
      });
      setCalcComparison(res.comparison);
    } catch (err: any) {
      toast.error(err.message || "Comparison calculation failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-foreground">Form 12BB Split-Pane Verification & Dual-Regime Suite</h2>
          <p className="text-xs text-muted-foreground">
            Audit employee tax exemption proofs against Section 192 rules with side-by-side document inspection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsCalculatorOpen(true);
              runComparison();
            }}
            className="h-8 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Calculator className="size-3.5" /> Dual-Regime Optimizer
          </Button>
        </div>
      </div>

      {/* 2. Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Declaration Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Employee Submissions ({filteredDeclarations.length})
                </CardTitle>
              </div>
              <div className="flex gap-1">
                {["all", "submitted", "verified"].map((st) => (
                  <Button
                    key={st}
                    variant={filterStatus === st ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterStatus(st)}
                    className="h-6 text-[10px] uppercase font-bold px-2"
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5 max-h-[600px] overflow-y-auto">
              {filteredDeclarations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs italic">
                  No declarations found matching filter.
                </div>
              ) : (
                filteredDeclarations.map((decl: any) => {
                  const isSelected = selectedDeclaration?.id === decl.id;
                  return (
                    <div
                      key={decl.id}
                      onClick={() => setSelectedDeclId(decl.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-xs"
                          : "bg-muted/10 border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-foreground">
                          {decl.employee?.firstName} {decl.employee?.lastName}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-mono font-bold ${
                            decl.taxRegime === "new"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              : "bg-purple-500/10 text-purple-600 border-purple-500/30"
                          }`}
                        >
                          {decl.taxRegime === "new" ? "Sec 115BAC (New)" : "Old Regime"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Claimed: ₹{Number(decl.totalDeductionClaimed || 0).toLocaleString("en-IN")}</span>
                        <span className="font-bold text-emerald-600">
                          Approved: ₹{Number(decl.totalDeductionApproved || 0).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50 text-[10px]">
                        <span className="text-muted-foreground font-mono">
                          {decl.proofs?.length || 0} proof attachment(s)
                        </span>
                        {decl.isRegimeLocked && (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                            <Lock className="size-2.5" /> Locked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Pane: Split-Pane Inspection Detail (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedDeclaration ? (
            <Card className="border shadow-2xs bg-card">
              <CardHeader className="p-4 pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>
                        {selectedDeclaration.employee?.firstName} {selectedDeclaration.employee?.lastName}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {selectedDeclaration.employee?.employeeCode}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      PAN: {selectedDeclaration.employee?.pan || "Not Provided"} &bull; FY{" "}
                      {selectedDeclaration.financialYear}
                    </CardDescription>
                  </div>

                  {/* PO-DEC-05 Regime Lock Status Badge */}
                  <div className="text-right">
                    {selectedDeclaration.isRegimeLocked ? (
                      <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400 gap-1 text-[10px] font-bold">
                        <Lock className="size-3" /> Locked for FY 2026-27 (PO-DEC-05)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground gap-1 text-[10px]">
                        Editable (Prior to First Payroll Run)
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-6">
                {/* Deduction Slices */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Declared Exemption Slices
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-2.5 rounded-lg border bg-muted/20">
                      <div className="text-[10px] font-semibold text-muted-foreground">Section 80C</div>
                      <div className="text-sm font-mono font-bold text-foreground">
                        ₹{Number(selectedDeclaration.section80C || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-muted/20">
                      <div className="text-[10px] font-semibold text-muted-foreground">Section 80D (Health)</div>
                      <div className="text-sm font-mono font-bold text-foreground">
                        ₹{Number(selectedDeclaration.section80D || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-muted/20">
                      <div className="text-[10px] font-semibold text-muted-foreground">HRA Annual Rent</div>
                      <div className="text-sm font-mono font-bold text-foreground">
                        ₹{Number(selectedDeclaration.houseRentPaid || 0).toLocaleString("en-IN")}
                      </div>
                      {selectedDeclaration.landlordPan && (
                        <div className="text-[9px] text-muted-foreground font-mono">
                          PAN: {selectedDeclaration.landlordPan}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 rounded-lg border bg-muted/20">
                      <div className="text-[10px] font-semibold text-muted-foreground">Home Loan Int. (24b)</div>
                      <div className="text-sm font-mono font-bold text-foreground">
                        ₹{Number(selectedDeclaration.homeLoanInterest || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-muted/20">
                      <div className="text-[10px] font-semibold text-muted-foreground">Section 80G</div>
                      <div className="text-sm font-mono font-bold text-foreground">
                        ₹{Number(selectedDeclaration.section80G || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30">
                      <div className="text-[10px] font-semibold text-emerald-600">Total Approved</div>
                      <div className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        ₹{Number(selectedDeclaration.totalDeductionApproved || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attached Proofs with Stream & Verification Actions */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
                    <span>Supporting Proof Attachments ({selectedDeclaration.proofs?.length || 0})</span>
                  </h4>

                  {(!selectedDeclaration.proofs || selectedDeclaration.proofs.length === 0) ? (
                    <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground italic">
                      No proofs attached yet for this declaration.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDeclaration.proofs.map((proof: any) => (
                        <div
                          key={proof.id}
                          className="p-3.5 rounded-lg border bg-card/80 space-y-3 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="size-4 text-primary" />
                              <div>
                                <span className="font-bold text-xs text-foreground">{proof.fileName}</span>
                                <Badge variant="secondary" className="ml-2 text-[9px] font-mono uppercase">
                                  {proof.section}
                                </Badge>
                              </div>
                            </div>

                            <a
                              href={proof.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                            >
                              <Eye className="size-3" /> View Stream
                            </a>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-xs">
                            <div className="text-muted-foreground">
                              Declared Amount:{" "}
                              <strong className="font-mono text-foreground">
                                ₹{Number(proof.declaredAmount || 0).toLocaleString("en-IN")}
                              </strong>
                            </div>

                            <div className="flex items-center gap-2">
                              {proof.status === "verified" ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[10px]">
                                  <CheckCircle2 className="size-3" /> Verified (₹
                                  {Number(proof.approvedAmount).toLocaleString("en-IN")})
                                </Badge>
                              ) : proof.status === "rejected" ? (
                                <Badge variant="destructive" className="gap-1 text-[10px]">
                                  <XCircle className="size-3" /> Rejected
                                </Badge>
                              ) : isHR ? (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      updateProofMutation.mutate({
                                        declId: selectedDeclaration.id,
                                        proofId: proof.id,
                                        status: "verified",
                                        approvedAmount: Number(proof.declaredAmount),
                                      })
                                    }
                                    disabled={updateProofMutation.isPending}
                                    className="h-6 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    Approve Full
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      updateProofMutation.mutate({
                                        declId: selectedDeclaration.id,
                                        proofId: proof.id,
                                        status: "rejected",
                                        rejectionReason: "Incomplete receipt or non-compliant proof document",
                                      })
                                    }
                                    disabled={updateProofMutation.isPending}
                                    className="h-6 text-[10px] font-bold text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 text-[10px]">
                                  Pending HR Review
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-20 border rounded-xl bg-card text-muted-foreground text-xs italic">
              Select an employee declaration from the left pane to audit details and attached proofs.
            </div>
          )}
        </div>
      </div>

      {/* 3. Dual-Regime Optimizer Modal */}
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calculator className="size-4 text-primary" />
              <span>Section 115BAC Dual-Regime Tax Calculator & Optimizer</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Simulate tax liabilities under New Tax Regime (Section 115BAC) vs Old Tax Regime to determine optimal tax withholding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Inputs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/20 text-xs">
              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">Annual Gross Salary</Label>
                <Input
                  type="number"
                  value={calcGross}
                  onChange={(e) => setCalcGross(Number(e.target.value))}
                  className="h-7 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">Section 80C</Label>
                <Input
                  type="number"
                  value={calc80C}
                  onChange={(e) => setCalc80C(Number(e.target.value))}
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">Section 80D (Health)</Label>
                <Input
                  type="number"
                  value={calc80D}
                  onChange={(e) => setCalc80D(Number(e.target.value))}
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">Annual Rent Paid</Label>
                <Input
                  type="number"
                  value={calcHraRent}
                  onChange={(e) => setCalcHraRent(Number(e.target.value))}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={runComparison} className="h-7 text-xs font-bold gap-1">
                Recalculate <ArrowRight className="size-3" />
              </Button>
            </div>

            {/* Comparison Cards */}
            {calcComparison && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* New Regime Card */}
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    calcComparison.recommendedRegime === "new"
                      ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                      : "bg-muted/10 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">Section 115BAC (New Regime)</span>
                    {calcComparison.recommendedRegime === "new" && (
                      <Badge className="bg-emerald-600 text-white text-[9px] uppercase font-bold">
                        Recommended
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Standard Deduction:</span>
                      <span className="font-mono font-bold text-foreground">₹75,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxable Income:</span>
                      <span className="font-mono font-bold text-foreground">
                        ₹{calcComparison.newRegime?.netTaxableIncome?.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Section 87A Rebate:</span>
                      <span className="font-mono text-emerald-600">
                        ₹{calcComparison.newRegime?.rebate87A?.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex justify-between items-center">
                    <span className="font-bold text-foreground">Total Annual Tax:</span>
                    <span className="text-base font-black font-mono text-foreground">
                      ₹{calcComparison.newRegime?.totalAnnualTax?.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Old Regime Card */}
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    calcComparison.recommendedRegime === "old"
                      ? "bg-purple-500/10 border-purple-500/40 shadow-xs"
                      : "bg-muted/10 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">Old Tax Regime</span>
                    {calcComparison.recommendedRegime === "old" && (
                      <Badge className="bg-purple-600 text-white text-[9px] uppercase font-bold">
                        Recommended
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Standard Deduction:</span>
                      <span className="font-mono font-bold text-foreground">₹50,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Chapter VI-A & HRA:</span>
                      <span className="font-mono font-bold text-foreground">
                        ₹{calcComparison.oldRegime?.totalDeductions?.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxable Income:</span>
                      <span className="font-mono font-bold text-foreground">
                        ₹{calcComparison.oldRegime?.netTaxableIncome?.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex justify-between items-center">
                    <span className="font-bold text-foreground">Total Annual Tax:</span>
                    <span className="text-base font-black font-mono text-foreground">
                      ₹{calcComparison.oldRegime?.totalAnnualTax?.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setIsCalculatorOpen(false)} className="h-8 text-xs font-bold">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
