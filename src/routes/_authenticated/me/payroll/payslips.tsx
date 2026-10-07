import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Receipt,
  Download,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  DollarSign,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/me/payroll/payslips")({
  component: MePayslipsPage,
});

export default function MePayslipsPage() {
  const [revealed, setRevealed] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // 1. Fetch Employee's Published Payslips
  const { data: payslipsData, isLoading, refetch } = useQuery({
    queryKey: ["me-payroll-payslips"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/payroll/payslips");
      return res.data;
    },
  });

  const payslips = payslipsData?.payslips || [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Payslips"
        description="Access and download your published monthly salary statements. Secured with standard password encryption."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRevealed(!revealed)}
            className="gap-1.5"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {revealed ? "Hide Figures" : "Reveal Salary"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Password Hint Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-600" />
            <span>
              <strong>PDF Password Hint:</strong> First 4 letters of your First Name (CAPITAL) + Day & Month of Birth (DDMM). Example: JOHN1508.
            </span>
          </div>
          <Badge variant="outline" className="border-blue-400 text-blue-700">Encrypted PDF</Badge>
        </CardContent>
      </Card>

      {/* Payslips List */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Statements History</CardTitle>
          <CardDescription>
            Chronological records released by Finance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 text-left font-medium">Pay Period</th>
                  <th className="p-3 text-right font-medium">Gross Earnings</th>
                  <th className="p-3 text-right font-medium">Total Deductions</th>
                  <th className="p-3 text-right font-medium">Net Take-Home</th>
                  <th className="p-3 text-center font-medium">Release Date</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading your payslips...
                    </td>
                  </tr>
                ) : payslips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No published payslips found. Payslips will appear here once finalized by HR.
                    </td>
                  </tr>
                ) : (
                  payslips.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold">
                        {new Date(p.periodYear, p.periodMonth - 1).toLocaleString("default", {
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {revealed ? `₹${Number(p.grossSalary || 0).toLocaleString("en-IN")}` : "₹ ••••••"}
                      </td>
                      <td className="p-3 text-right font-medium text-destructive">
                        {revealed ? `-₹${Number(p.deductions || 0).toLocaleString("en-IN")}` : "-₹ ••••••"}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {revealed ? `₹${Number(p.netSalary || 0).toLocaleString("en-IN")}` : "₹ ••••••"}
                      </td>
                      <td className="p-3 text-center text-xs text-muted-foreground">
                        {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("en-IN") : "Published"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const res = await api.get(`/api/v1/me/payroll/payslips/${p.id}`);
                            setSelectedPayslip(res.data.payslip);
                          }}
                          className="gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Slip
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

      {/* Payslip View Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Salary Statement — {selectedPayslip && new Date(selectedPayslip.periodYear, selectedPayslip.periodMonth - 1).toLocaleString("default", { month: "long", year: "numeric" })}
            </DialogTitle>
            <DialogDescription>
              Confidential payroll statement generated by MASTERHRMS.
            </DialogDescription>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Earnings</h4>
                  <div className="text-sm space-y-1.5">
                    {selectedPayslip.breakdown?.earnings?.map((e: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-0.5 border-b border-muted/20">
                        <span className="text-muted-foreground text-xs">{e.name}</span>
                        <span className="font-semibold text-xs">₹{Number(e.amount).toLocaleString("en-IN")}</span>
                      </div>
                    )) || (
                      <div className="flex justify-between">
                        <span>Gross Remuneration</span>
                        <span>₹{Number(selectedPayslip.grossSalary).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-destructive">Deductions</h4>
                  <div className="text-sm space-y-1.5">
                    {selectedPayslip.breakdown?.deductions?.map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-0.5 border-b border-muted/20">
                        <span className="text-muted-foreground text-xs">{d.name}</span>
                        <span className="font-semibold text-xs text-destructive">-₹{Number(d.amount).toLocaleString("en-IN")}</span>
                      </div>
                    )) || (
                      <div className="flex justify-between">
                        <span>Total Deductions</span>
                        <span>-₹{Number(selectedPayslip.deductions).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-lg flex items-center justify-between border">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Net Take-Home Pay</span>
                  <div className="text-2xl font-black text-emerald-600">
                    ₹{Number(selectedPayslip.netSalary).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Attendance Credited: {selectedPayslip.breakdown?.attendance?.payableDays || 30} Days</p>
                  <p>Loss of Pay: {selectedPayslip.breakdown?.attendance?.finalLopDays || 0} Days</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayslip(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                toast.success("Printing payslip document...");
                window.print();
              }}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" /> Download / Print PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
