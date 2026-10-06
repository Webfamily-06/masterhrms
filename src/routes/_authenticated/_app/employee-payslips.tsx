import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Eye,
  CreditCard,
  Building2,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Printer,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Percent,
  Landmark,
  Calculator,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/employee-payslips")({
  component: EmployeePayslipsPage,
  head: () => ({ meta: [{ title: "My Payslips & Tax Declaration — Master HRMS" }] }),
});

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function fmtINR(val: number | string | null | undefined): string {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function EmployeePayslipsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [activeTab, setActiveTab] = useState<"payslips" | "tax_declaration">("payslips");
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  // Proof form state
  const [proofSection, setProofSection] = useState("80C");
  const [proofFileName, setProofFileName] = useState("");
  const [proofFileUrl, setProofFileUrl] = useState("");
  const [proofAmount, setProofAmount] = useState("");

  // Fetch employee payslips
  const { data: payslipsRes, isLoading: isPayslipsLoading } = useQuery({
    queryKey: ["my-payslips"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/payslips");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const payslips: any[] = payslipsRes || [];

  // Fetch employee tax declaration
  const { data: taxRes, isLoading: isTaxLoading } = useQuery({
    queryKey: ["my-tax-declaration"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/tax-declaration");
        return res?.data || null;
      } catch {
        return null;
      }
    },
  });
  const taxDecl = taxRes || {};

  // Tax form state (initialized from DB or fallback)
  const [taxRegime, setTaxRegime] = useState<"new" | "old">("new");
  const [sec80C, setSec80C] = useState<string>("0");
  const [sec80D, setSec80D] = useState<string>("0");
  const [sec80G, setSec80G] = useState<string>("0");
  const [rentPaid, setRentPaid] = useState<string>("0");
  const [landlordPan, setLandlordPan] = useState<string>("");
  const [landlordName, setLandlordName] = useState<string>("");
  const [landlordAddress, setLandlordAddress] = useState<string>("");
  const [homeLoanInterest, setHomeLoanInterest] = useState<string>("0");
  const [otherIncome, setOtherIncome] = useState<string>("0");
  const [hasLoadedDecl, setHasLoadedDecl] = useState(false);

  // Sync state when tax declaration is fetched
  if (taxRes && !hasLoadedDecl) {
    setTaxRegime((taxRes.taxRegime as "new" | "old") || "new");
    setSec80C(String(taxRes.section80C || 0));
    setSec80D(String(taxRes.section80D || 0));
    setSec80G(String(taxRes.section80G || 0));
    setRentPaid(String(taxRes.houseRentPaid || 0));
    setLandlordPan(taxRes.landlordPan || "");
    setLandlordName(taxRes.landlordName || "");
    setLandlordAddress(taxRes.landlordAddress || "");
    setHomeLoanInterest(String(taxRes.homeLoanInterest || 0));
    setOtherIncome(String(taxRes.otherIncome || 0));
    setHasLoadedDecl(true);
  }

  // Save Tax Declaration Mutation
  const saveTaxMut = useMutation({
    mutationFn: async () => {
      return await api.put("/api/v1/me/tax-declaration", {
        taxRegime,
        section80C: Number(sec80C || 0),
        section80D: Number(sec80D || 0),
        section80G: Number(sec80G || 0),
        houseRentPaid: Number(rentPaid || 0),
        landlordPan: landlordPan || undefined,
        landlordName: landlordName || undefined,
        landlordAddress: landlordAddress || undefined,
        homeLoanInterest: Number(homeLoanInterest || 0),
        otherIncome: Number(otherIncome || 0),
      });
    },
    onSuccess: () => {
      toast.success("Tax declaration updated and submitted for review!");
      qc.invalidateQueries({ queryKey: ["my-tax-declaration"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update tax declaration.");
    },
  });

  // Upload Proof Mutation
  const uploadProofMut = useMutation({
    mutationFn: async () => {
      return await api.post("/api/v1/me/tax-declaration/proofs", {
        section: proofSection,
        fileName: proofFileName,
        fileUrl: proofFileUrl,
        fileType: "application/pdf",
        declaredAmount: Number(proofAmount || 0),
      });
    },
    onSuccess: () => {
      toast.success("Investment proof attached successfully!");
      setIsProofModalOpen(false);
      setProofFileName("");
      setProofFileUrl("");
      setProofAmount("");
      qc.invalidateQueries({ queryKey: ["my-tax-declaration"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to attach proof document.");
    },
  });

  const latestSlip = payslips[0];
  const totalDeductionsClaimed =
    Number(sec80C || 0) +
    Number(sec80D || 0) +
    Number(sec80G || 0) +
    Number(rentPaid || 0) +
    Number(homeLoanInterest || 0);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/hrm-dashboard" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link to="/employee-dashboard" className="hover:text-foreground">Employee Portal</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">My Payslips & Tax Compliance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="size-6 text-primary" />
            <span>My Payslips & Tax Declaration</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review monthly salary credit slips, itemized allowances & deductions, tax regime elections, and Form 12BB investment proofs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "px-3 py-1 font-mono text-xs font-bold",
              taxRegime === "new" ? "bg-primary/10 text-primary border-primary/30" : "bg-purple-500/10 text-purple-600 border-purple-500/30"
            )}
          >
            {taxRegime === "new" ? "New Tax Regime (Sec 115BAC)" : "Old Tax Regime (Exemptions Enabled)"}
          </Badge>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs text-muted-foreground font-semibold">Latest Take-Home Pay</span>
            <div className="my-2">
              <h3 className="text-2xl font-bold text-emerald-600">
                {latestSlip ? fmtINR(latestSlip.netSalary) : "—"}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {latestSlip ? `${MONTH_NAMES[latestSlip.periodMonth]} ${latestSlip.periodYear}` : "No pay run logged"}
              </p>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Disbursed via Bank Transfer
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs text-muted-foreground font-semibold">Annual Tax Regime</span>
            <div className="my-2">
              <h3 className="text-2xl font-bold text-blue-600 uppercase">
                {taxRegime} Regime
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">FY 2026-2027 Assessment</p>
            </div>
            <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
              {taxDecl.isRegimeLocked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
              {taxDecl.isRegimeLocked ? "Regime Locked by HR" : "Election Open"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20 shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs text-muted-foreground font-semibold">Total Declared Deductions</span>
            <div className="my-2">
              <h3 className="text-2xl font-bold text-purple-600">
                {fmtINR(totalDeductionsClaimed)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                80C, 80D, HRA & Home Loan
              </p>
            </div>
            <div className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
              <Percent className="size-3" /> Form 12BB Declared
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs text-muted-foreground font-semibold">Tax Verification Status</span>
            <div className="my-2">
              <h3 className="text-2xl font-bold text-amber-600 uppercase">
                {taxDecl.status || "DRAFT"}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {taxDecl.proofs?.length || 0} Investment Proof(s) Linked
              </p>
            </div>
            <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
              <AlertCircle className="size-3" /> Reviewed by Payroll Team
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed Section ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/40 h-10 p-1 flex gap-1 w-full justify-start border">
          <TabsTrigger value="payslips" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <FileText className="size-3.5 text-primary" />
            <span>Salary Slips History ({payslips.length})</span>
          </TabsTrigger>
          <TabsTrigger value="tax_declaration" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Calculator className="size-3.5 text-purple-600" />
            <span>Income Tax & Form 12BB Declaration</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Payslips History ── */}
        <TabsContent value="payslips" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-base font-bold">Monthly Payslip Archive</CardTitle>
              <CardDescription className="text-xs">
                View earnings breakdown, statutory deductions (PF, ESI, TDS), and download official PDF payslips.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Pay Period</TableHead>
                    <TableHead className="text-xs font-bold">Gross Salary</TableHead>
                    <TableHead className="text-xs font-bold">Total Deductions</TableHead>
                    <TableHead className="text-xs font-bold">Net Salary (Take Home)</TableHead>
                    <TableHead className="text-xs font-bold">Generated At</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPayslipsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                        Loading payslips...
                      </TableCell>
                    </TableRow>
                  ) : payslips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground italic">
                        No payslips generated yet for your account. Once your HR/Finance team executes a monthly payroll run, your itemized slips will appear here.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payslips.map((slip: any) => (
                      <TableRow key={slip.id} className="hover:bg-muted/30 text-xs">
                        <TableCell className="font-mono font-bold text-foreground">
                          {MONTH_NAMES[slip.periodMonth]} {slip.periodYear}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {fmtINR(slip.grossSalary)}
                        </TableCell>
                        <TableCell className="font-mono text-rose-600 font-semibold">
                          -{fmtINR(slip.deductions)}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-emerald-600">
                          {fmtINR(slip.netSalary)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {new Date(slip.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSlip(slip);
                              setIsSlipModalOpen(true);
                            }}
                            className="h-7 text-xs font-bold gap-1"
                          >
                            <Eye className="size-3.5" />
                            <span>View Breakdown</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Tax & Form 12BB Declaration ── */}
        <TabsContent value="tax_declaration" className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveTaxMut.mutate();
            }}
            className="space-y-6"
          >
            {/* Regime Choice Box */}
            <Card className="border shadow-xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="size-4 text-primary" />
                    <span>Tax Regime Election (Financial Year 2026-2027)</span>
                  </div>
                  {taxDecl.isRegimeLocked && (
                    <Badge variant="destructive" className="text-[10px]">
                      Locked by Payroll Admin
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose between the New Tax Regime (simplified default rates under Section 115BAC) or Old Tax Regime with standard Chapter VI-A deductions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => !taxDecl.isRegimeLocked && setTaxRegime("new")}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    taxRegime === "new"
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border hover:border-muted-foreground/30",
                    taxDecl.isRegimeLocked && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-foreground">New Tax Regime</span>
                    {taxRegime === "new" && <CheckCircle2 className="size-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lower slab tax rates without the hassle of submitting investment receipts. Standard deduction of ₹75,000 applies automatically.
                  </p>
                </div>

                <div
                  onClick={() => !taxDecl.isRegimeLocked && setTaxRegime("old")}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    taxRegime === "old"
                      ? "border-purple-600 bg-purple-500/5 shadow-xs"
                      : "border-border hover:border-muted-foreground/30",
                    taxDecl.isRegimeLocked && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-foreground">Old Tax Regime</span>
                    {taxRegime === "old" && <CheckCircle2 className="size-4 text-purple-600" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enables Chapter VI-A deductions: Section 80C (up to ₹1.5L), Section 80D Mediclaim, HRA rent exemption, and Home Loan interest.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Deductions Inputs (Active under Old Regime or informational under New Regime) */}
            <Card className="border shadow-xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="size-4 text-purple-600" />
                    <span>Deduction Declarations (Chapter VI-A)</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsProofModalOpen(true)}
                    className="h-7 text-xs font-bold gap-1"
                  >
                    <Plus className="size-3.5" />
                    <span>Attach Proof Document</span>
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs">
                  Declare your estimated investments to adjust monthly TDS deductions from your payroll.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Section 80C (EPF, PPF, ELSS, Life Ins) <span className="text-muted-foreground font-normal">(Max ₹1.5L)</span>
                    </Label>
                    <Input
                      type="number"
                      value={sec80C}
                      onChange={(e) => setSec80C(e.target.value)}
                      className="h-9 text-xs font-mono"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Section 80D (Health Insurance / Mediclaim) <span className="text-muted-foreground font-normal">(Max ₹25k/₹50k)</span>
                    </Label>
                    <Input
                      type="number"
                      value={sec80D}
                      onChange={(e) => setSec80D(e.target.value)}
                      className="h-9 text-xs font-mono"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Section 80G (Charitable Donations)</Label>
                    <Input
                      type="number"
                      value={sec80G}
                      onChange={(e) => setSec80G(e.target.value)}
                      className="h-9 text-xs font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Home Loan Interest (Section 24b)</Label>
                    <Input
                      type="number"
                      value={homeLoanInterest}
                      onChange={(e) => setHomeLoanInterest(e.target.value)}
                      className="h-9 text-xs font-mono"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Other Income / Bank Interest</Label>
                    <Input
                      type="number"
                      value={otherIncome}
                      onChange={(e) => setOtherIncome(e.target.value)}
                      className="h-9 text-xs font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* HRA Section */}
                <div className="pt-3 border-t space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-primary" />
                    <span>House Rent Allowance (HRA) Details</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Total Annual Rent Paid (₹)</Label>
                      <Input
                        type="number"
                        value={rentPaid}
                        onChange={(e) => setRentPaid(e.target.value)}
                        className="h-9 text-xs font-mono"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Landlord PAN (Required if &gt; ₹1L/yr)</Label>
                      <Input
                        type="text"
                        value={landlordPan}
                        onChange={(e) => setLandlordPan(e.target.value.toUpperCase())}
                        className="h-9 text-xs font-mono"
                        placeholder="ABCDE1234F"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Landlord Full Name</Label>
                      <Input
                        type="text"
                        value={landlordName}
                        onChange={(e) => setLandlordName(e.target.value)}
                        className="h-9 text-xs"
                        placeholder="e.g. Ramesh Kumar"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Rented Property Address</Label>
                    <Input
                      type="text"
                      value={landlordAddress}
                      onChange={(e) => setLandlordAddress(e.target.value)}
                      className="h-9 text-xs"
                      placeholder="Flat No, Building, City, Pin Code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attached Proofs Table */}
            {taxDecl.proofs && taxDecl.proofs.length > 0 && (
              <Card className="border shadow-xs">
                <CardHeader className="p-4 border-b bg-muted/20">
                  <CardTitle className="text-sm font-bold">Attached Proof Documents ({taxDecl.proofs.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Section</TableHead>
                        <TableHead className="text-xs font-bold">Document Name</TableHead>
                        <TableHead className="text-xs font-bold">Declared Amount</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold text-right">Attached On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxDecl.proofs.map((proof: any) => (
                        <TableRow key={proof.id} className="hover:bg-muted/30 text-xs">
                          <TableCell className="font-mono font-bold">{proof.section}</TableCell>
                          <TableCell className="text-foreground">{proof.fileName}</TableCell>
                          <TableCell className="font-mono">{fmtINR(proof.declaredAmount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold uppercase",
                                proof.status === "verified" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                                proof.status === "pending" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                                proof.status === "rejected" && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              )}
                            >
                              {proof.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-[11px]">
                            {new Date(proof.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Save Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={saveTaxMut.isPending}
                className="font-bold bg-primary text-primary-foreground h-10 px-6 shadow-xs"
              >
                {saveTaxMut.isPending ? "Saving Declaration..." : "Save & Submit Declaration"}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Itemized Payslip Modal ── */}
      <Dialog open={isSlipModalOpen} onOpenChange={setIsSlipModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                <span>Salary Slip — {selectedSlip ? `${MONTH_NAMES[selectedSlip.periodMonth]} ${selectedSlip.periodYear}` : ""}</span>
              </div>
              <Badge variant="outline" className="font-mono text-emerald-600 bg-emerald-50 border-emerald-200">
                Paid
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Employee Code: {profile?.id || "EMP"} • Department: Engineering • Role: {profile?.role || "Team Member"}
            </DialogDescription>
          </DialogHeader>

          {selectedSlip && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 rounded-md border text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold">Payment Mode:</span>
                  <span className="ml-2 font-mono font-bold text-foreground">Direct Bank Credit</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Gross Salary:</span>
                  <span className="ml-2 font-mono font-bold text-foreground">{fmtINR(selectedSlip.grossSalary)}</span>
                </div>
              </div>

              {/* Earnings & Deductions Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Earnings */}
                <div className="border rounded-md p-3 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-600 uppercase border-b pb-1.5">Earnings</h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Basic Pay</span>
                    <span className="font-mono font-bold">{fmtINR(Number(selectedSlip.grossSalary) * 0.5)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">House Rent Allowance (HRA)</span>
                    <span className="font-mono font-bold">{fmtINR(Number(selectedSlip.grossSalary) * 0.25)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Special Allowance</span>
                    <span className="font-mono font-bold">{fmtINR(Number(selectedSlip.grossSalary) * 0.25)}</span>
                  </div>
                  <div className="pt-2 border-t flex justify-between text-xs font-bold">
                    <span>Total Earnings</span>
                    <span className="font-mono text-emerald-600">{fmtINR(selectedSlip.grossSalary)}</span>
                  </div>
                </div>

                {/* Right: Deductions */}
                <div className="border rounded-md p-3 space-y-2">
                  <h4 className="text-xs font-bold text-rose-600 uppercase border-b pb-1.5">Deductions</h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Provident Fund (Employee EPF)</span>
                    <span className="font-mono font-bold">{fmtINR(Number(selectedSlip.deductions) * 0.6)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Professional Tax (PT)</span>
                    <span className="font-mono font-bold">₹200</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">TDS / Income Tax</span>
                    <span className="font-mono font-bold">{fmtINR(Math.max(0, Number(selectedSlip.deductions) * 0.4 - 200))}</span>
                  </div>
                  <div className="pt-2 border-t flex justify-between text-xs font-bold">
                    <span>Total Deductions</span>
                    <span className="font-mono text-rose-600">-{fmtINR(selectedSlip.deductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Salary Highlight */}
              <div className="p-4 bg-primary/5 rounded-md border border-primary/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-primary">Net Amount Payable</span>
                  <p className="text-[11px] text-muted-foreground">Credited to registered salary bank account</p>
                </div>
                <span className="text-2xl font-bold font-mono text-primary">
                  {fmtINR(selectedSlip.netSalary)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="size-4" />
              <span>Print Slip</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsSlipModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Upload Proof Modal ── */}
      <Dialog open={isProofModalOpen} onOpenChange={setIsProofModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              <span>Attach Tax Investment Proof</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload rent receipts, LIC receipts, or mutual fund statements for HR verification.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!proofFileName || !proofFileUrl) {
                toast.error("Please fill in file name and document URL.");
                return;
              }
              uploadProofMut.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deduction Section</Label>
              <select
                value={proofSection}
                onChange={(e) => setProofSection(e.target.value)}
                className="w-full h-9 rounded-md border text-xs px-2.5 bg-background"
              >
                <option value="80C">Section 80C (PPF, ELSS, Insurance)</option>
                <option value="80D">Section 80D (Mediclaim / Health)</option>
                <option value="80G">Section 80G (Charitable Donations)</option>
                <option value="HRA">House Rent Allowance (Rent Agreement / Receipts)</option>
                <option value="HOME_LOAN">Home Loan Interest Certificate</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Document Name</Label>
              <Input
                type="text"
                placeholder="e.g. HDFC Life Premium Receipt 2026.pdf"
                value={proofFileName}
                onChange={(e) => setProofFileName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Document URL / Storage Key</Label>
              <Input
                type="text"
                placeholder="https://... or /uploads/receipt.pdf"
                value={proofFileUrl}
                onChange={(e) => setProofFileUrl(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Declared Amount (₹)</Label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={proofAmount}
                onChange={(e) => setProofAmount(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsProofModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={uploadProofMut.isPending}
                className="font-bold bg-primary text-primary-foreground"
              >
                {uploadProofMut.isPending ? "Attaching..." : "Attach Document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
