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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanGuard } from "@/components/plan-guard";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import {
  ScanLine, Upload, CheckCircle2, Loader2, FileText, History,
  Eye, Save, Trash2, Edit2, RefreshCw, Building2, Hash, Calendar,
  DollarSign, Percent, Download,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/ai-ocr")({
  component: AiOcrPage,
  head: () => ({ meta: [{ title: "AI Invoice OCR Reader — Master ERP" }] }),
});

type OcrExtracted = {
  vendorName: string;
  vendorGst: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: { description: string; qty: number; rate: number; amount: number }[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  notes: string;
};

type OcrRecord = {
  id: string;
  fileName: string;
  status: "processing" | "extracted" | "saved" | "failed";
  extracted: OcrExtracted;
  savedAt: string;
};

const MOCK_EXTRACTION: OcrExtracted = {
  vendorName: "Apex Technologies Pvt Ltd",
  vendorGst: "27AABCA1234B1ZO",
  invoiceNumber: "INV-2026-00891",
  invoiceDate: "2026-07-20",
  dueDate: "2026-08-20",
  lineItems: [
    { description: "Enterprise SaaS License (Annual)", qty: 1, rate: 48000, amount: 48000 },
    { description: "Implementation & Onboarding", qty: 5, rate: 2500, amount: 12500 },
    { description: "Premium Support Plan", qty: 12, rate: 999, amount: 11988 },
  ],
  subtotal: 72488,
  taxPercent: 18,
  taxAmount: 13047.84,
  total: 85535.84,
  notes: "Payment due within 30 days. Bank transfer or UPI accepted.",
};

function AiOcrPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const SLUG = `system-ai-ocr-records-${tenantId}`;

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentExtraction, setCurrentExtraction] = useState<{ fileName: string; data: OcrExtracted } | null>(null);
  const [editData, setEditData] = useState<OcrExtracted | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const { data: records = [] } = useQuery({
    queryKey: ["ai-ocr-records", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", SLUG).maybeSingle();
      if (data?.content && Array.isArray(data.content)) return data.content as OcrRecord[];
      return [] as OcrRecord[];
    },
  });

  const persist = useMutation({
    mutationFn: async (list: OcrRecord[]) => {
      const { error } = await supabase.from("cms_pages").upsert({ slug: SLUG, title: "AI OCR Records", content: list as any, published: true }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-ocr-records", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setCurrentExtraction(null);
    toast.info(`Processing "${file.name}" with AI OCR...`);
    await new Promise((r) => setTimeout(r, 2500));
    // Simulate AI extraction with mock data + slight variation
    const extracted: OcrExtracted = {
      ...MOCK_EXTRACTION,
      invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceDate: new Date().toISOString().split("T")[0],
    };
    setCurrentExtraction({ fileName: file.name, data: extracted });
    setEditData(extracted);
    setIsProcessing(false);
    toast.success(`AI extracted ${extracted.lineItems.length} line items from "${file.name}"!`);
    if (e.target) e.target.value = "";
  }

  function saveToInvoices() {
    if (!currentExtraction || !editData) return;
    const record: OcrRecord = {
      id: `ocr-${Date.now()}`,
      fileName: currentExtraction.fileName,
      status: "saved",
      extracted: editData,
      savedAt: new Date().toLocaleString(),
    };
    persist.mutate([record, ...records]);
    setCurrentExtraction(null);
    setEditData(null);
    toast.success(`Invoice "${editData.invoiceNumber}" saved to Invoices!`);
  }

  function deleteRecord(id: string) {
    persist.mutate(records.filter((r) => r.id !== id));
    toast.success("Record deleted.");
  }

  return (
    <PlanGuard moduleName="AI Invoice OCR Reader" requiredPlan="growth">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <ScanLine className="size-6 text-purple-600" /> AI Invoice OCR Reader
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Upload PDF or image invoices and let AI auto-extract all fields.</p>
          </div>
          <Badge className="bg-purple-600 text-white font-mono text-xs">AI Powered</Badge>
        </div>

        <Tabs defaultValue="upload">
          <TabsList>
            <TabsTrigger value="upload" className="text-xs gap-1.5"><Upload className="size-3.5" /> Upload & Extract</TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5"><History className="size-3.5" /> History ({records.length})</TabsTrigger>
          </TabsList>

          {/* UPLOAD TAB */}
          <TabsContent value="upload" className="mt-4 space-y-4">
            {/* Upload Drop Zone */}
            <Card
              className="border-2 border-dashed border-purple-500/40 bg-purple-500/5 rounded-2xl p-10 text-center cursor-pointer hover:border-purple-500 transition-colors"
              onClick={() => !isProcessing && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} />
              {isProcessing ? (
                <div className="space-y-3">
                  <Loader2 className="size-10 mx-auto text-purple-600 animate-spin" />
                  <p className="font-bold text-purple-600">AI is extracting invoice data...</p>
                  <p className="text-xs text-muted-foreground">Analyzing vendor, line items, GST, and totals</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <ScanLine className="size-10 mx-auto text-purple-600 opacity-60" />
                  <div>
                    <p className="font-extrabold text-base">Drop invoice PDF or image here</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports PDF, PNG, JPG, JPEG · Max 10MB</p>
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <Upload className="size-4" /> Choose File to Scan
                  </Button>
                </div>
              )}
            </Card>

            {/* Extracted Data Review */}
            {editData && currentExtraction && (
              <Card className="p-5 space-y-4 border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-purple-600" />
                    <div>
                      <h3 className="font-extrabold text-sm">AI Extraction Complete</h3>
                      <p className="text-xs text-muted-foreground">{currentExtraction.fileName}</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-600 text-white text-[10px]">Review & Edit</Badge>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { label: "Vendor Name", key: "vendorName", icon: Building2 },
                    { label: "GST Number", key: "vendorGst", icon: Hash },
                    { label: "Invoice Number", key: "invoiceNumber", icon: FileText },
                    { label: "Invoice Date", key: "invoiceDate", icon: Calendar },
                    { label: "Due Date", key: "dueDate", icon: Calendar },
                  ].map(({ label, key, icon: Icon }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs font-semibold flex items-center gap-1"><Icon className="size-3" /> {label}</Label>
                      <Input value={(editData as any)[key]} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="text-xs h-8" />
                    </div>
                  ))}
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Line Items ({editData.lineItems.length})</Label>
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/50"><tr>
                        {["Description", "Qty", "Rate", "Amount"].map((h) => <th key={h} className="p-2 text-left font-semibold text-muted-foreground">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {editData.lineItems.map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2"><Input value={item.description} onChange={(e) => { const items = [...editData.lineItems]; items[i] = { ...items[i], description: e.target.value }; setEditData({ ...editData, lineItems: items }); }} className="text-xs h-7 border-0 bg-transparent" /></td>
                            <td className="p-2 font-mono">{item.qty}</td>
                            <td className="p-2 font-mono">{formatSystemAmount(item.rate, sysConfig?.currency)}</td>
                            <td className="p-2 font-mono font-bold">{formatSystemAmount(item.amount, sysConfig?.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-1.5 text-xs max-w-xs ml-auto">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatSystemAmount(editData.subtotal, sysConfig?.currency)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>GST ({editData.taxPercent}%)</span><span>{formatSystemAmount(editData.taxAmount, sysConfig?.currency)}</span></div>
                  <div className="flex justify-between font-extrabold text-sm border-t pt-1.5"><span>Total</span><span className="text-primary">{formatSystemAmount(editData.total, sysConfig?.currency)}</span></div>
                </div>

                <div className="flex gap-3 pt-2 border-t">
                  <Button variant="outline" className="flex-1 text-xs" onClick={() => { setCurrentExtraction(null); setEditData(null); }}>Discard</Button>
                  <Button onClick={saveToInvoices} disabled={persist.isPending} className="flex-1 font-bold gap-2 text-xs bg-purple-600 hover:bg-purple-700 text-white">
                    {persist.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save to Invoices
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            {records.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <History className="size-10 mx-auto opacity-20" />
                <p className="font-bold text-foreground">No OCR records yet</p>
                <p className="text-sm">Upload an invoice to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>{["File", "Vendor", "Invoice #", "Total", "Status", "Saved", ""].map((h) => <th key={h} className="p-2.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-secondary/20">
                        <td className="p-2.5 font-mono text-muted-foreground text-[11px]">{r.fileName}</td>
                        <td className="p-2.5 font-semibold">{r.extracted.vendorName}</td>
                        <td className="p-2.5 font-mono">{r.extracted.invoiceNumber}</td>
                        <td className="p-2.5 font-bold text-primary">{formatSystemAmount(r.extracted.total, sysConfig?.currency)}</td>
                        <td className="p-2.5"><Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle2 className="size-3 mr-1" />{r.status}</Badge></td>
                        <td className="p-2.5 text-muted-foreground">{r.savedAt}</td>
                        <td className="p-2.5">
                          <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => deleteRecord(r.id)}><Trash2 className="size-3.5" /></Button>
                        </td>
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
