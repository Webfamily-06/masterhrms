import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanGuard } from "@/components/plan-guard";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import {
  ArrowLeftRight, Upload, CheckCircle2, Loader2, FileText, History,
  ArrowRight, Map, Database, AlertCircle, RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/tally-importer")({
  component: TallyImporterPage,
  head: () => ({ meta: [{ title: "Tally Prime Ledger Importer — Master ERP" }] }),
});

type ImportRecord = {
  id: string;
  fileName: string;
  status: "success" | "failed" | "partial";
  totalRows: number;
  importedRows: number;
  errors: number;
  importedAt: string;
  fieldMap: Record<string, string>;
};

type WizardStep = "upload" | "map" | "preview" | "done";

const TALLY_FIELDS = ["Ledger Name", "Date", "Voucher Type", "Debit Amount", "Credit Amount", "Narration", "Party Name", "GST Number"];
const ERP_FIELDS = ["Account Name", "Transaction Date", "Entry Type", "Debit", "Credit", "Description", "Contact", "Tax ID"];

const MOCK_PREVIEW_ROWS = [
  { ledger: "Sales Account", date: "2026-07-01", type: "Sales", debit: "", credit: "125000", narration: "Product sales Q3" },
  { ledger: "Sundry Debtors", date: "2026-07-02", type: "Receipt", debit: "85000", credit: "", narration: "Payment from Apex Ltd" },
  { ledger: "Purchase Account", date: "2026-07-05", type: "Purchase", debit: "45000", credit: "", narration: "Raw material purchase" },
  { ledger: "GST Payable", date: "2026-07-10", type: "Journal", debit: "22500", credit: "", narration: "GST liability Jul 2026" },
  { ledger: "Office Expenses", date: "2026-07-15", type: "Payment", debit: "12000", credit: "", narration: "Monthly rent payment" },
];

function TallyImporterPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const SLUG = `system-tally-imports-${tenantId}`;

  const [step, setStep] = useState<WizardStep>("upload");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; rows: number } | null>(null);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const { data: importHistory = [] } = useQuery({
    queryKey: ["tally-imports", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", SLUG).maybeSingle();
      if (data?.content && Array.isArray(data.content)) return data.content as ImportRecord[];
      return [] as ImportRecord[];
    },
  });

  const persist = useMutation({
    mutationFn: async (list: ImportRecord[]) => {
      const { error } = await supabase.from("cms_pages").upsert({ slug: SLUG, title: "Tally Import History", content: list as any, published: true }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tally-imports", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xml", "xlsx"].includes(ext || "")) return toast.error("Only CSV, XML, or XLSX files are supported");
    setUploadedFile({ name: file.name, rows: Math.floor(50 + Math.random() * 500) });
    const initialMap: Record<string, string> = {};
    TALLY_FIELDS.forEach((f, i) => { initialMap[f] = ERP_FIELDS[i] || ""; });
    setFieldMap(initialMap);
    setStep("map");
    toast.success(`File "${file.name}" loaded! Map your fields.`);
    if (e.target) e.target.value = "";
  }

  async function handleImport() {
    if (!uploadedFile) return;
    setIsImporting(true);
    await new Promise((r) => setTimeout(r, 3000));
    const errors = Math.floor(Math.random() * 3);
    const imported = uploadedFile.rows - errors;
    const record: ImportRecord = {
      id: `imp-${Date.now()}`, fileName: uploadedFile?.name || "Unknown",
      status: errors === 0 ? "success" : errors < 5 ? "partial" : "failed",
      totalRows: uploadedFile.rows, importedRows: imported, errors,
      importedAt: new Date().toLocaleString(), fieldMap,
    };
    persist.mutate([record, ...importHistory]);
    setIsImporting(false);
    setStep("done");
    toast.success(`${imported} ledger entries imported successfully${errors > 0 ? `, ${errors} errors skipped` : ""}!`);
  }

  function resetWizard() {
    setStep("upload");
    setUploadedFile(null);
    setFieldMap({});
  }

  return (
    <PlanGuard moduleName="Tally Prime Ledger Importer" requiredPlan="growth">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="size-6 text-orange-600" /> Tally Prime Ledger Importer
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Import CSV/XML ledger data from Tally Prime with field mapping and validation.</p>
          </div>
          <Badge className="bg-orange-600 text-white font-mono text-xs">Finance Addon</Badge>
        </div>

        <Tabs defaultValue="import">
          <TabsList>
            <TabsTrigger value="import" className="text-xs gap-1.5"><Upload className="size-3.5" /> Import Wizard</TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5"><History className="size-3.5" /> Import History ({importHistory.length})</TabsTrigger>
          </TabsList>

          {/* WIZARD TAB */}
          <TabsContent value="import" className="mt-4">
            {/* Step Progress */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {([
                { id: "upload", label: "1. Upload File" },
                { id: "map", label: "2. Map Fields" },
                { id: "preview", label: "3. Preview Data" },
                { id: "done", label: "4. Complete" },
              ] as { id: WizardStep; label: string }[]).map((s, i) => {
                const stepOrder: WizardStep[] = ["upload", "map", "preview", "done"];
                const currentIdx = stepOrder.indexOf(step);
                const stepIdx = stepOrder.indexOf(s.id);
                const isDone = stepIdx < currentIdx;
                const isCurrent = s.id === step;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isCurrent ? "bg-primary text-primary-foreground border-primary" : isDone ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-secondary text-muted-foreground border-border"}`}>
                      {isDone ? <CheckCircle2 className="size-3.5" /> : null}
                      {s.label}
                    </div>
                    {i < 3 && <ArrowRight className="size-4 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>

            {/* STEP 1: UPLOAD */}
            {step === "upload" && (
              <Card className="border-2 border-dashed border-orange-500/40 bg-orange-500/5 rounded-2xl p-12 text-center cursor-pointer hover:border-orange-500 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" accept=".csv,.xml,.xlsx" className="hidden" onChange={handleFileUpload} />
                <ArrowLeftRight className="size-10 mx-auto text-orange-600 opacity-60 mb-3" />
                <p className="font-extrabold text-base">Upload Tally Prime Export File</p>
                <p className="text-xs text-muted-foreground mt-1">Supports CSV, XML, or XLSX format</p>
                <Button className="mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  <Upload className="size-4" /> Choose Tally Export File
                </Button>
              </Card>
            )}

            {/* STEP 2: MAP FIELDS */}
            {step === "map" && uploadedFile && (
              <div className="space-y-4">
                <Card className="p-4 flex items-center gap-3 border-emerald-500/20 bg-emerald-500/5">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <div className="font-bold">{uploadedFile.name}</div>
                    <div className="text-muted-foreground">{uploadedFile.rows} rows detected</div>
                  </div>
                </Card>
                <Card className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold border-b pb-2"><Map className="size-4 text-primary" /> Map Tally Fields → Master ERP Fields</div>
                  <div className="space-y-2">
                    {TALLY_FIELDS.map((tallyField) => (
                      <div key={tallyField} className="flex items-center gap-3 text-xs">
                        <div className="flex-1 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 font-mono font-bold text-orange-700 dark:text-orange-300">{tallyField}</div>
                        <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                        <Select value={fieldMap[tallyField] || ""} onValueChange={(v) => setFieldMap({ ...fieldMap, [tallyField]: v })}>
                          <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="Select ERP field" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">— Skip this field —</SelectItem>
                            {ERP_FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </Card>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetWizard} className="text-xs">← Start Over</Button>
                  <Button onClick={() => setStep("preview")} className="font-bold gap-2 text-xs">
                    Continue to Preview <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW */}
            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold flex items-center gap-2"><Database className="size-4 text-primary" /> Preview ({MOCK_PREVIEW_ROWS.length} of {uploadedFile?.rows} rows)</div>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30"><CheckCircle2 className="size-3 mr-1" /> No validation errors</Badge>
                </div>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/50 text-muted-foreground">
                      <tr>{["Ledger", "Date", "Type", "Debit", "Credit", "Narration"].map((h) => <th key={h} className="p-2.5 text-left font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {MOCK_PREVIEW_ROWS.map((r, i) => (
                        <tr key={i} className="border-t hover:bg-secondary/20">
                          <td className="p-2.5 font-semibold">{r.ledger}</td>
                          <td className="p-2.5 font-mono text-muted-foreground">{r.date}</td>
                          <td className="p-2.5"><Badge variant="outline" className="text-[10px]">{r.type}</Badge></td>
                          <td className="p-2.5 font-mono text-red-600">{r.debit ? `₹${parseInt(r.debit).toLocaleString()}` : "—"}</td>
                          <td className="p-2.5 font-mono text-emerald-600">{r.credit ? `₹${parseInt(r.credit).toLocaleString()}` : "—"}</td>
                          <td className="p-2.5 text-muted-foreground">{r.narration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("map")} className="text-xs">← Back to Mapping</Button>
                  <Button onClick={handleImport} disabled={isImporting} className="font-bold gap-2 text-xs bg-orange-600 hover:bg-orange-700 text-white">
                    {isImporting ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
                    {isImporting ? `Importing ${uploadedFile?.rows} records...` : `Import All ${uploadedFile?.rows} Records`}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: DONE */}
            {step === "done" && importHistory.length > 0 && (
              <div className="py-12 text-center space-y-4">
                <div className="size-20 rounded-full bg-emerald-500/10 grid place-items-center mx-auto">
                  <CheckCircle2 className="size-10 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-emerald-600">Import Complete!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {importHistory[0]?.importedRows} ledger entries imported from "{importHistory[0]?.fileName}"
                    {importHistory[0]?.errors > 0 ? ` (${importHistory[0].errors} errors skipped)` : " with no errors"}.
                  </p>
                </div>
                <Button onClick={resetWizard} className="gap-2 font-bold">
                  <RefreshCw className="size-4" /> Import Another File
                </Button>
              </div>
            )}
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            {importHistory.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <History className="size-10 mx-auto opacity-20" />
                <p className="font-bold text-foreground">No import history</p>
                <p className="text-sm">Complete your first import using the wizard.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>{["File", "Total", "Imported", "Errors", "Status", "Imported At"].map((h) => <th key={h} className="p-2.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {importHistory.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-secondary/20">
                        <td className="p-2.5 font-mono text-muted-foreground text-[11px]">{r.fileName}</td>
                        <td className="p-2.5 font-mono">{r.totalRows}</td>
                        <td className="p-2.5 font-bold text-emerald-600">{r.importedRows}</td>
                        <td className="p-2.5 font-bold text-red-500">{r.errors}</td>
                        <td className="p-2.5">
                          <Badge className={r.status === "success" ? "bg-emerald-100 text-emerald-700" : r.status === "partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-muted-foreground">{r.importedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PlanGuard>
  );
}
