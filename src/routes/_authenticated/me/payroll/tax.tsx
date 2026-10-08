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
  Save,
  RefreshCw,
  ShieldCheck,
  Percent,
  CheckCircle2,
  Clock,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/payroll/tax")({
  component: MeTaxPage,
});

export default function MeTaxPage() {
  const queryClient = useQueryClient();

  const { data: taxData, isLoading, refetch } = useQuery({
    queryKey: ["me-payroll-tax"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/payroll/tax");
      return res.data;
    },
  });

  const declaration = taxData?.declaration;
  const financialYear = taxData?.financialYear || "2026-2027";

  // Form State
  const [formState, setFormState] = useState({
    taxRegime: declaration?.taxRegime || "new",
    section80C: declaration ? Number(declaration.section80C) : 150000,
    section80D: declaration ? Number(declaration.section80D) : 25000,
    section80G: declaration ? Number(declaration.section80G) : 0,
    houseRentPaid: declaration ? Number(declaration.houseRentPaid) : 180000,
    landlordPan: declaration?.landlordPan || "",
    landlordName: declaration?.landlordName || "",
    homeLoanInterest: declaration ? Number(declaration.homeLoanInterest) : 0,
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post("/api/v1/me/payroll/tax/declare", payload);
    },
    onSuccess: () => {
      toast.success("Investment declaration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["me-payroll-tax"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save declaration");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Tax Declarations & Investment Proofs"
        description="Declare Section 80C, 80D Mediclaim, HRA rent, and investment exemptions for TDS optimization."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={() =>
              submitMutation.mutate({
                ...formState,
                financialYear,
              })
            }
            disabled={submitMutation.isPending}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="h-4 w-4" /> Save Declaration
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Financial Year"
          value={financialYear}
          description="Current tax assessment period"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Selected Tax Regime"
          value={`${formState.taxRegime.toUpperCase()} Regime`}
          description={formState.taxRegime === "new" ? "Standard ₹75K deduction" : "Old deduction slabs"}
          icon={<Percent className="h-5 w-5" />}
        />
        <StatCard
          title="Total Claimed"
          value={`₹${(Number(formState.section80C) + Number(formState.section80D) + Number(formState.homeLoanInterest)).toLocaleString("en-IN")}`}
          description="Gross tax exemptions claimed"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Declaration Status"
          value={declaration?.status ? declaration.status.toUpperCase() : "DRAFT"}
          description="HR verification status"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      {/* Declaration Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 80 Deductions */}
        <Card>
          <CardHeader>
            <CardTitle>Chapter VI-A Deductions</CardTitle>
            <CardDescription>
              Standard income tax deductions under the Income-tax Act.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Tax Regime</label>
              <select
                value={formState.taxRegime}
                onChange={(e) => setFormState({ ...formState, taxRegime: e.target.value })}
                className="w-full border rounded-md p-2 bg-background text-sm"
              >
                <option value="new">New Tax Regime (Default — Lower slabs, Standard ₹75K deduction)</option>
                <option value="old">Old Tax Regime (Allows 80C, 80D & HRA deductions)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section 80C (PPF, ELSS, EPF, Life Insurance)</label>
              <Input
                type="number"
                value={formState.section80C}
                onChange={(e) => setFormState({ ...formState, section80C: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Statutory maximum ceiling: ₹1,50,000</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section 80D (Health Insurance Premium)</label>
              <Input
                type="number"
                value={formState.section80D}
                onChange={(e) => setFormState({ ...formState, section80D: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Self/Family max: ₹25,000 (Parents: ₹50,000)</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Home Loan Interest (Section 24)</label>
              <Input
                type="number"
                value={formState.homeLoanInterest}
                onChange={(e) => setFormState({ ...formState, homeLoanInterest: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Self-occupied property limit: ₹2,00,000</p>
            </div>
          </CardContent>
        </Card>

        {/* HRA Exemption */}
        <Card>
          <CardHeader>
            <CardTitle>House Rent Allowance (HRA)</CardTitle>
            <CardDescription>
              Rent paid receipts for claiming HRA tax exemption.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Annual House Rent Paid (₹)</label>
              <Input
                type="number"
                value={formState.houseRentPaid}
                onChange={(e) => setFormState({ ...formState, houseRentPaid: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Landlord Full Name</label>
              <Input
                value={formState.landlordName}
                onChange={(e) => setFormState({ ...formState, landlordName: e.target.value })}
                placeholder="Name as per PAN"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Landlord PAN</label>
              <Input
                value={formState.landlordPan}
                onChange={(e) => setFormState({ ...formState, landlordPan: e.target.value.toUpperCase() })}
                placeholder="Required if annual rent > ₹1,00,000"
              />
            </div>

            <div className="p-3 bg-muted/20 border rounded-md text-xs space-y-1">
              <p><strong>Exemption Calculation:</strong> Minimum of:</p>
              <p>1. Actual HRA received</p>
              <p>2. Rent paid minus 10% of Basic Salary</p>
              <p>3. 50% of Basic Salary (Metro) or 40% (Non-Metro)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proofs List */}
      <Card>
        <CardHeader>
          <CardTitle>Attached Proof Documents</CardTitle>
          <CardDescription>
            Supporting documents submitted for verified tax exemptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {declaration?.proofs?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No investment proof files attached yet.</p>
          ) : (
            <div className="border rounded-md divide-y text-sm">
              {declaration?.proofs?.map((p: any) => (
                <div key={p.id} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{p.section}</span> — {p.fileName}
                    <div className="text-xs text-muted-foreground">
                      Claimed: ₹{Number(p.declaredAmount).toLocaleString("en-IN")} • Approved: ₹{Number(p.approvedAmount).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <Badge variant={p.status === "verified" ? "default" : "outline"} className="capitalize">
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
