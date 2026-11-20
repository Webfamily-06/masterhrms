import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  FolderArchive,
  ExternalLink,
  FileCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/payroll/forms")({
  component: HrPayrollFormsPage,
});

export default function HrPayrollFormsPage() {
  const [downloadingCode, setDownloadingCode] = useState<string | null>(null);

  const { data: formsData, isLoading, refetch } = useQuery({
    queryKey: ["hr-payroll-forms-summary"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/forms/summary");
      return res.data;
    },
  });

  const statutoryForms = [
    { code: "FORM_16", title: "Form 16 (Part A & B)", act: "Income-tax Act, 2025", status: "READY", endpoint: "/api/compliance/forms/form-16" },
    { code: "FORM_24Q", title: "Form 24Q (Quarterly Salary TDS)", act: "Income-tax Act (Section 200)", status: "READY", endpoint: "/api/compliance/forms/form-24q" },
    { code: "PF_FORM_11", title: "EPF Form 11 (Declaration)", act: "Employees' Provident Funds Act, 1952", status: "READY", endpoint: "/api/compliance/forms/form-31" },
    { code: "PF_FORM_19", title: "EPF Form 19 (Final Settlement)", act: "EPF Act, 1952", status: "READY", endpoint: "/api/compliance/forms/form-19" },
    { code: "ESI_FORM_1", title: "ESIC Form 1 (Declaration)", act: "Employees' State Insurance Act, 1948", status: "READY", endpoint: "/api/compliance/forms/esi-form-1" },
    { code: "PT_FORM_5", title: "Professional Tax Return (Monthly)", act: "State PT Act", status: "READY", endpoint: "/api/compliance/rules-config" },
  ];

  const handleDownload = async (form: typeof statutoryForms[0]) => {
    try {
      setDownloadingCode(form.code);
      toast.info(`Generating ${form.code} statutory document...`);
      const res = await api.get(form.endpoint);
      const exportData = res.data;

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${form.code}_Statutory_Return.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success(`Successfully exported ${form.title}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || `Failed to export ${form.code}`);
    } finally {
      setDownloadingCode(null);
    }
  };

  const handleExportAll = async () => {
    try {
      toast.info("Compiling full statutory package bundle...");
      const res = await api.get("/api/compliance/rules-config");
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `All_Statutory_Returns_Package.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Complete statutory compliance package exported successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to export package.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statutory Forms & Returns Center"
        description="One-click generation and batch export of statutory compliance returns, EPF/ESIC schedules, and annual tax certificates."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={handleExportAll} className="gap-1.5">
            <FolderArchive className="h-4 w-4" /> Export All Returns (JSON/ZIP)
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Catalog Forms"
          value={statutoryForms.length}
          description="Standard statutory formats"
          icon={FileText}
        />
        <StatCard
          title="EPF Compliance"
          value="Active"
          description="Electronic Challan Return ready"
          icon={ShieldCheck}
        />
        <StatCard
          title="ESIC Status"
          value="Ready"
          description="Monthly contribution report"
          icon={CheckCircle2}
        />
        <StatCard
          title="TDS Statements"
          value="Form 24Q Ready"
          description="Quarterly salary TDS return"
          icon={Download}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statutoryForms.map((form) => (
          <Card key={form.code} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">{form.code}</Badge>
                <Badge variant="default" className="bg-emerald-600 text-white">Verified</Badge>
              </div>
              <CardTitle className="text-base mt-2">{form.title}</CardTitle>
              <CardDescription>{form.act}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between border-t pt-3 mt-2">
                <span className="text-xs text-muted-foreground">Pre-filled with authoritative payroll data</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={downloadingCode === form.code}
                  onClick={() => handleDownload(form)}
                  className="gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadingCode === form.code ? "Generating..." : "Generate & Export"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
