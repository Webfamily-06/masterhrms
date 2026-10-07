import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/employees/import")({
  component: EmployeeImportPage,
  head: () => ({
    meta: [{ title: "Bulk Employee Import — Master HRMS" }],
  }),
});

interface DryRunReport {
  totalRecords: number;
  validCount: number;
  errorCount: number;
  errors: Array<{ row: number; field: string; message: string }>;
  preview: any[];
  canCommit: boolean;
  validatedRows: any[];
}

export function EmployeeImportPage() {
  const navigate = useNavigate();
  const [rawText, setRawText] = useState("");
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);

  // Dry run validation mutation
  const dryRunMutation = useMutation({
    mutationFn: async (records: any[]) => {
      return await api.post("/hr/employees/import/dry-run", { records });
    },
    onSuccess: (data: DryRunReport) => {
      setDryRunReport(data);
      if (data.canCommit) {
        toast.success(`Validation passed: ${data.validCount} valid records found.`);
      } else {
        toast.error(`Validation found ${data.errorCount} errors. Fix before committing.`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Dry run validation failed");
    },
  });

  // Commit mutation
  const commitMutation = useMutation({
    mutationFn: async (validatedRows: any[]) => {
      return await api.post("/hr/employees/import/commit", { validatedRows });
    },
    onSuccess: (res: any) => {
      toast.success(`Successfully imported ${res.importedCount} employees!`);
      navigate({ to: "/hr/employees" as any });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to commit import batch");
    },
  });

  // Simple CSV parser
  const parseCsv = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      toast.error("CSV must contain at least a header and one data row.");
      return [];
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(",").map((v) => v.trim());
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || "";
      });
      records.push(rowObj);
    }

    return records;
  };

  const handleRunValidation = () => {
    if (!rawText.trim()) {
      toast.error("Please paste CSV data or load template first.");
      return;
    }
    const parsed = parseCsv(rawText);
    if (parsed.length > 0) {
      dryRunMutation.mutate(parsed);
    }
  };

  const handleLoadSample = () => {
    const sample = `firstName,lastName,email,employeeCode,position,employmentType
Aarav,Patel,aarav.patel@company.com,EMP-8001,Product Lead,full_time
Meera,Nair,meera.nair@company.com,EMP-8002,UX Designer,full_time
Kunal,Verma,kunal.verma@company.com,EMP-8003,Backend Engineer,full_time`;
    setRawText(sample);
    setDryRunReport(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-2">
        <Link to="/hr/employees">
          <Button variant="ghost" size="sm" className="gap-1.5 h-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Directory
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Bulk Employee Import & Dry Run"
        description="Batch upload workforce records with strict schema validation, duplicate detection, and dry-run reporting prior to commit."
        icon={UploadCloud}
        actions={
          <Button variant="outline" size="sm" onClick={handleLoadSample} className="gap-1.5">
            <Download className="h-4 w-4" />
            Load Sample CSV
          </Button>
        }
      />

      {/* Upload / Paste Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            1. Paste CSV Workforce Data
          </CardTitle>
          <CardDescription>
            Columns required: <span className="font-mono">firstName, lastName, email, employeeCode, position, employmentType</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setDryRunReport(null);
            }}
            rows={6}
            className="w-full rounded-md border border-input bg-background p-3 text-xs font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="firstName,lastName,email,employeeCode,position,employmentType&#10;John,Doe,john.doe@company.com,EMP-1001,Analyst,full_time"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleRunValidation}
              disabled={dryRunMutation.isPending || !rawText.trim()}
              className="gap-2"
            >
              {dryRunMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Run Validation & Dry Run
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dry Run Validation Report */}
      {dryRunReport && (
        <Card className="border-t-4 border-t-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  2. Validation Report & Dry Run Analysis
                </CardTitle>
                <CardDescription>
                  Evaluated {dryRunReport.totalRecords} records against workspace schema and duplicate indexes.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={dryRunReport.canCommit ? "default" : "destructive"}>
                  {dryRunReport.canCommit ? "Validation Clean" : "Errors Detected"}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border p-3 bg-muted/20">
                <div className="text-2xl font-bold">{dryRunReport.totalRecords}</div>
                <div className="text-xs text-muted-foreground">Total Parsed</div>
              </div>
              <div className="rounded-lg border p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600">
                <div className="text-2xl font-bold">{dryRunReport.validCount}</div>
                <div className="text-xs">Valid Records</div>
              </div>
              <div className="rounded-lg border p-3 bg-destructive/10 text-destructive">
                <div className="text-2xl font-bold">{dryRunReport.errorCount}</div>
                <div className="text-xs">Blocking Errors</div>
              </div>
            </div>

            {/* Error table if any */}
            {dryRunReport.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Validation Discrepancies ({dryRunReport.errors.length})
                </h4>
                <ul className="text-xs space-y-1 text-destructive/90 max-h-48 overflow-y-auto pl-4 list-disc">
                  {dryRunReport.errors.map((err, idx) => (
                    <li key={idx}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview table */}
            {dryRunReport.preview.length > 0 && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dryRunReport.preview.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs font-medium">
                          {p.employeeCode}
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.firstName} {p.lastName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.email}</TableCell>
                        <TableCell className="text-xs">{p.position || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Commit Button */}
            <div className="flex justify-end pt-2 border-t">
              <Button
                onClick={() => commitMutation.mutate(dryRunReport.validatedRows)}
                disabled={!dryRunReport.canCommit || commitMutation.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {commitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm & Commit {dryRunReport.validCount} Employees
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
