import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  RefreshCw,
  ShieldAlert,
  Percent,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/payroll/tax")({
  component: HrPayrollTaxPage,
});

export default function HrPayrollTaxPage() {
  const queryClient = useQueryClient();
  const [selectedFy, setSelectedFy] = useState("2026-2027");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeclaration, setSelectedDeclaration] = useState<any | null>(null);
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [proofReviewForm, setProofReviewForm] = useState({
    approvedAmount: 0,
    status: "verified",
    rejectionReason: "",
  });

  // 1. Fetch Declarations
  const { data: declData, isLoading, refetch } = useQuery({
    queryKey: ["hr-tax-declarations", selectedFy],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/tax/declarations", {
        params: { financialYear: selectedFy },
      });
      return res.data;
    },
  });

  const declarations = declData?.declarations || [];

  const filteredDeclarations = declarations.filter((d: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = `${d.employee?.firstName || ""} ${d.employee?.lastName || ""}`.toLowerCase();
    const code = (d.employee?.employeeCode || "").toLowerCase();
    return name.includes(term) || code.includes(term);
  });

  // Verify Proof Mutation
  const verifyProofMutation = useMutation({
    mutationFn: async (payload: { proofId: string; status: string; approvedAmount?: number; rejectionReason?: string }) => {
      return api.patch(`/api/v1/hr/payroll/tax/proofs/${payload.proofId}`, payload);
    },
    onSuccess: () => {
      toast.success("Investment proof status updated");
      setSelectedProof(null);
      queryClient.invalidateQueries({ queryKey: ["hr-tax-declarations"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update proof");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Tax Declarations & Proof Verification"
        description="Verify employee Section 80C, 80D, HRA rent receipts, and investment proofs under the Income-tax Act."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Declarations"
          value={declarations.length}
          description={`Filed for FY ${selectedFy}`}
          icon={FileText}
        />
        <StatCard
          title="New Regime"
          value={declarations.filter((d: any) => d.taxRegime === "new").length}
          description="Default statutory regime"
          icon={Percent}
        />
        <StatCard
          title="Old Regime"
          value={declarations.filter((d: any) => d.taxRegime === "old").length}
          description="Deduction claiming employees"
          icon={ShieldAlert}
        />
        <StatCard
          title="Submitted Proofs"
          value={declarations.reduce((acc: number, d: any) => acc + (d.proofs?.length || 0), 0)}
          description="Uploaded attachments for review"
          icon={CheckCircle2}
        />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Financial Year:</span>
              <select
                value={selectedFy}
                onChange={(e) => setSelectedFy(e.target.value)}
                className="border rounded-md px-2.5 py-1.5 bg-background text-sm"
              >
                <option value="2026-2027">FY 2026-2027 (Current)</option>
                <option value="2025-2026">FY 2025-2026</option>
              </select>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Declarations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Declarations</CardTitle>
          <CardDescription>
            Section 80C (₹1.5L max), 80D Mediclaim, HRA Rent, and Home Loan Interest exemptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 text-left font-medium">Employee</th>
                  <th className="p-3 text-center font-medium">Regime</th>
                  <th className="p-3 text-right font-medium">Section 80C</th>
                  <th className="p-3 text-right font-medium">Section 80D</th>
                  <th className="p-3 text-right font-medium">Annual Rent</th>
                  <th className="p-3 text-right font-medium">Home Loan</th>
                  <th className="p-3 text-right font-medium">Total Claimed</th>
                  <th className="p-3 text-center font-medium">Proofs</th>
                  <th className="p-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      Loading declarations...
                    </td>
                  </tr>
                ) : filteredDeclarations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No tax declarations found for FY {selectedFy}.
                    </td>
                  </tr>
                ) : (
                  filteredDeclarations.map((d: any) => (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold">
                        <div>{d.employee?.firstName} {d.employee?.lastName}</div>
                        <span className="text-xs text-muted-foreground font-mono">{d.employee?.employeeCode}</span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={d.taxRegime === "new" ? "default" : "outline"} className="capitalize">
                          {d.taxRegime} Regime
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-medium">
                        ₹{Number(d.section80C || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-medium">
                        ₹{Number(d.section80D || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-medium">
                        ₹{Number(d.houseRentPaid || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-medium">
                        ₹{Number(d.homeLoanInterest || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        ₹{Number(d.totalDeductionClaimed || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary">{d.proofs?.length || 0} files</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedDeclaration(d)}
                          className="gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Review
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Review Declaration Dialog */}
      <Dialog open={!!selectedDeclaration} onOpenChange={() => setSelectedDeclaration(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Tax Declaration Review — {selectedDeclaration?.employee?.firstName} {selectedDeclaration?.employee?.lastName}
            </DialogTitle>
            <DialogDescription>
              FY {selectedDeclaration?.financialYear} • {selectedDeclaration?.taxRegime.toUpperCase()} Tax Regime
            </DialogDescription>
          </DialogHeader>
          {selectedDeclaration && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm border rounded-lg p-3 bg-muted/20">
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Total Claimed</p>
                  <p className="text-lg font-bold">₹{Number(selectedDeclaration.totalDeductionClaimed || 0).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Total Approved</p>
                  <p className="text-lg font-bold text-emerald-600">₹{Number(selectedDeclaration.totalDeductionApproved || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>

              <h4 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Attached Proofs</h4>
              {selectedDeclaration.proofs?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No investment proof files uploaded.</p>
              ) : (
                <div className="border rounded-md divide-y text-sm">
                  {selectedDeclaration.proofs.map((proof: any) => (
                    <div key={proof.id} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{proof.section}</span> — {proof.fileName}
                        <div className="text-xs text-muted-foreground">
                          Claimed: ₹{Number(proof.declaredAmount).toLocaleString("en-IN")} • Status: <span className="capitalize font-medium">{proof.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProof(proof);
                            setProofReviewForm({
                              approvedAmount: Number(proof.declaredAmount),
                              status: "verified",
                              rejectionReason: "",
                            });
                          }}
                        >
                          Verify
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedDeclaration(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Proof Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Investment Proof</DialogTitle>
            <DialogDescription>
              {selectedProof?.section}: {selectedProof?.fileName} (Claimed: ₹{Number(selectedProof?.declaredAmount).toLocaleString("en-IN")})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Decision</label>
              <select
                value={proofReviewForm.status}
                onChange={(e) => setProofReviewForm({ ...proofReviewForm, status: e.target.value })}
                className="w-full border rounded-md p-2 bg-background text-sm"
              >
                <option value="verified">Approve / Verified</option>
                <option value="rejected">Reject Proof</option>
              </select>
            </div>

            {proofReviewForm.status === "verified" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Approved Amount (₹)</label>
                <Input
                  type="number"
                  value={proofReviewForm.approvedAmount}
                  onChange={(e) => setProofReviewForm({ ...proofReviewForm, approvedAmount: Number(e.target.value) })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Input
                  value={proofReviewForm.rejectionReason}
                  onChange={(e) => setProofReviewForm({ ...proofReviewForm, rejectionReason: e.target.value })}
                  placeholder="e.g. Receipt date falls outside financial year"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProof(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                verifyProofMutation.mutate({
                  proofId: selectedProof.id,
                  status: proofReviewForm.status,
                  approvedAmount: proofReviewForm.status === "verified" ? proofReviewForm.approvedAmount : 0,
                  rejectionReason: proofReviewForm.rejectionReason,
                })
              }
              disabled={verifyProofMutation.isPending}
            >
              Submit Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
