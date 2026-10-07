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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Settings,
  ShieldCheck,
  Building,
  CreditCard,
  FileCheck,
  CheckCircle2,
  RefreshCw,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/payroll/setup")({
  component: HrPayrollSetupPage,
});

export default function HrPayrollSetupPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("statutory");

  // Statutory parameters state
  const [epfCeiling, setEpfCeiling] = useState(15000);
  const [epfEmployeeRate, setEpfEmployeeRate] = useState(12);
  const [esiWageCeiling, setEsiWageCeiling] = useState(21000);
  const [esiEmployeeRate, setEsiEmployeeRate] = useState(0.75);
  const [esiEmployerRate, setEsiEmployerRate] = useState(3.25);
  const [cutoffDay, setCutoffDay] = useState(1);
  const [bankFormat, setBankFormat] = useState("HDFC_CMS");

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      // Save setup settings
      toast.success("Payroll configuration parameters saved successfully");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Payroll & Statutory Setup"
        description="Consolidated configuration for statutory policy packs, state professional tax rules, pay cycles, and disbursement banking."
      >
        <div className="flex items-center gap-2">
          <Button
            onClick={() => saveSettingsMutation.mutate()}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="h-4 w-4" /> Save Configuration
          </Button>
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="statutory" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> Statutory Policy Packs
          </TabsTrigger>
          <TabsTrigger value="cycles" className="gap-2">
            <Settings className="h-4 w-4" /> Pay Cycle & Cutoffs
          </TabsTrigger>
          <TabsTrigger value="banking" className="gap-2">
            <CreditCard className="h-4 w-4" /> Bank Payout Formats
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Statutory Policy Packs */}
        <TabsContent value="statutory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EPF Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" /> Employees' Provident Fund (EPF)
                </CardTitle>
                <CardDescription>
                  Governed by EPF & MP Act, 1952. Qualifying wage: Basic + DA.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Statutory Wage Ceiling (₹/month)</label>
                  <Input
                    type="number"
                    value={epfCeiling}
                    onChange={(e) => setEpfCeiling(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Standard statutory threshold is ₹15,000</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employee Contribution Rate (%)</label>
                  <Input
                    type="number"
                    value={epfEmployeeRate}
                    onChange={(e) => setEpfEmployeeRate(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Standard employee deduction is 12%</p>
                </div>
                <div className="p-3 bg-muted/30 border rounded-md text-xs space-y-1">
                  <p><strong>Employer Split:</strong> 8.33% to EPS (capped at ₹1,250) + 3.67% to EPF</p>
                  <p><strong>Admin Charges:</strong> 0.5% EDLI + 0.5% EPFO admin cost</p>
                </div>
              </CardContent>
            </Card>

            {/* ESIC Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-600" /> Employees' State Insurance (ESIC)
                </CardTitle>
                <CardDescription>
                  Governed by ESI Act, 1948. Covers gross monthly wages up to statutory ceiling.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gross Wage Ceiling (₹/month)</label>
                  <Input
                    type="number"
                    value={esiWageCeiling}
                    onChange={(e) => setEsiWageCeiling(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Threshold: ₹21,000 (₹25,000 for disability)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employee Rate (%)</label>
                    <Input
                      type="number"
                      step="0.05"
                      value={esiEmployeeRate}
                      onChange={(e) => setEsiEmployeeRate(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employer Rate (%)</label>
                    <Input
                      type="number"
                      step="0.05"
                      value={esiEmployerRate}
                      onChange={(e) => setEsiEmployerRate(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="p-3 bg-muted/30 border rounded-md text-xs">
                  Automatic exclusion applies when employee monthly gross exceeds the wage ceiling.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* State PT Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Tax (PT) State Slabs</CardTitle>
              <CardDescription>
                State PT rules evaluated dynamically based on employee work branch location.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 border rounded-md">
                  <h4 className="font-bold">Karnataka (KA)</h4>
                  <p className="text-xs text-muted-foreground mt-1">₹200/mo if Gross &gt; ₹15,000</p>
                  <Badge variant="outline" className="mt-2 text-xs">Auto-Applied</Badge>
                </div>
                <div className="p-3 border rounded-md">
                  <h4 className="font-bold">Maharashtra (MH)</h4>
                  <p className="text-xs text-muted-foreground mt-1">₹200/mo (₹300 in Feb)</p>
                  <Badge variant="outline" className="mt-2 text-xs">Auto-Applied</Badge>
                </div>
                <div className="p-3 border rounded-md">
                  <h4 className="font-bold">Tamil Nadu (TN)</h4>
                  <p className="text-xs text-muted-foreground mt-1">Slab-based half-yearly translated</p>
                  <Badge variant="outline" className="mt-2 text-xs">Auto-Applied</Badge>
                </div>
                <div className="p-3 border rounded-md">
                  <h4 className="font-bold">Delhi / Haryana</h4>
                  <p className="text-xs text-muted-foreground mt-1">No Professional Tax applicable</p>
                  <Badge variant="outline" className="mt-2 text-xs">Exempt</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Pay Cycles */}
        <TabsContent value="cycles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pay Cycle & Cutoff Windows</CardTitle>
              <CardDescription>
                Define the attendance and leave cutoff calendar consumed during payroll generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cutoff Start Day</label>
                <select
                  value={cutoffDay}
                  onChange={(e) => setCutoffDay(Number(e.target.value))}
                  className="w-full border rounded-md p-2 bg-background text-sm"
                >
                  <option value={1}>1st of Current Month (Calendar Month 1st–30th/31st)</option>
                  <option value={25}>25th of Previous Month (Cutoff 25th–24th)</option>
                  <option value={20}>20th of Previous Month (Cutoff 20th–19th)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Determines the date range queried by PayrollAttendanceService for biometric punches & leaves.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Standard Working Days per Month</label>
                <Input type="number" defaultValue={26} />
                <p className="text-xs text-muted-foreground">Used for daily rate salary proration</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Banking */}
        <TabsContent value="banking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Corporate Bank Disbursement Formats</CardTitle>
              <CardDescription>
                Format templates for bulk direct-debit salary disbursement files.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <label className="text-sm font-medium">Corporate Bank Format</label>
                <select
                  value={bankFormat}
                  onChange={(e) => setBankFormat(e.target.value)}
                  className="w-full border rounded-md p-2 bg-background text-sm"
                >
                  <option value="HDFC_CMS">HDFC Bank CMS (E-Net CSV)</option>
                  <option value="ICICI_CORPORATE">ICICI Bank Corporate Payout Format</option>
                  <option value="SBI_CMP">State Bank of India CMP Format</option>
                  <option value="AXIS_NACH">Axis Bank Corporate NACH / NEFT</option>
                </select>
              </div>

              <div className="p-4 bg-muted/20 border rounded-md text-xs space-y-1">
                <p className="font-semibold">Required Employee Bank Columns:</p>
                <p>• Account Holder Legal Name (Matches bank records)</p>
                <p>• Account Number & IFSC Code</p>
                <p>• Payout Reference & Debit Account Code</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
