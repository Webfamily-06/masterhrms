import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  Download,
  ShieldCheck,
  Building,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/payroll/statutory-forms")({
  component: MeStatutoryFormsPage,
});

export default function MeStatutoryFormsPage() {
  const { data: formsData, isLoading, refetch } = useQuery({
    queryKey: ["me-payroll-statutory-forms"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/payroll/statutory-forms");
      return res.data;
    },
  });

  const employeeInfo = formsData?.employeeInfo;
  const forms = formsData?.availableForms || [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Statutory Certificates & PF/ESI Forms"
        description="Download your annual Form 16 TDS certificate, investment declaration Form 12BB, and pre-filled EPF declarations."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Profile Statutory Identification Card */}
      <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-muted-foreground">Statutory Profile Verified</span>
            <div className="font-bold text-base">{employeeInfo?.name} ({employeeInfo?.code})</div>
            <div className="text-xs text-muted-foreground">
              PAN: <span className="font-mono">{employeeInfo?.pan}</span> • UAN: <span className="font-mono">{employeeInfo?.uan}</span>
            </div>
          </div>
          <Badge variant="default" className="bg-emerald-600 text-white">Statutory Active</Badge>
        </CardContent>
      </Card>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {forms.map((f: any) => (
          <Card key={f.code} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">{f.code}</Badge>
                {f.year && <Badge variant="secondary">{f.year}</Badge>}
              </div>
              <CardTitle className="text-base mt-2">{f.title}</CardTitle>
              <CardDescription>
                Generated using official payroll records verified by finance.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between border-t pt-3 mt-2">
                <span className="text-xs text-muted-foreground">Ready for download</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success(`Downloading ${f.code} document...`)}
                  className="gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
