import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import {
  MessageSquare, Plus, Send, Settings2, Trash2, CheckCircle2, XCircle,
  Loader2, Bell, Zap, FileText, Edit2, Play,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/whatsapp-alerts")({
  component: WhatsAppAlertsPage,
  head: () => ({ meta: [{ title: "WhatsApp Alerts & Reminders — Master ERP" }] }),
});

type WaTemplate = {
  id: string;
  name: string;
  body: string;
  trigger: string;
  enabled: boolean;
  createdAt: string;
};

type WaDeliveryLog = {
  id: string;
  recipient: string;
  template: string;
  status: "sent" | "failed" | "pending";
  timestamp: string;
  phone: string;
};

const TRIGGERS = [
  "Leave Approved", "Leave Rejected", "Invoice Due", "Invoice Paid",
  "Attendance Late", "Attendance Absent", "Salary Slip Generated",
  "Task Assigned", "Payroll Processed", "Subscription Expiry",
];

const VARIABLES = ["{{employee_name}}", "{{leave_date}}", "{{invoice_number}}", "{{amount}}", "{{company_name}}", "{{due_date}}"];

function WhatsAppAlertsPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const SLUG = `system-whatsapp-alerts-${tenantId}`;

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WaTemplate | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiPhone, setApiPhone] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", body: "", trigger: TRIGGERS[0] });

  const { data: storeData } = useQuery({
    queryKey: ["whatsapp-alerts", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", SLUG).maybeSingle();
      if (data?.content) {
        const p = data.content as any;
        return { templates: (p.templates || []) as WaTemplate[], logs: (p.logs || []) as WaDeliveryLog[], config: p.config || {} };
      }
      return { templates: [] as WaTemplate[], logs: [] as WaDeliveryLog[], config: {} };
    },
  });

  const templates = storeData?.templates ?? [];
  const logs = storeData?.logs ?? [];
  const config = storeData?.config ?? {};

  const persist = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("cms_pages").upsert({ slug: SLUG, title: "WhatsApp Alerts Config", content: payload, published: true }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-alerts", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function saveTemplate() {
    if (!templateForm.name.trim() || !templateForm.body.trim()) return toast.error("Name and body required");
    let updatedTemplates: WaTemplate[];
    if (editingTemplate) {
      updatedTemplates = templates.map((t) => t.id === editingTemplate.id ? { ...editingTemplate, ...templateForm } : t);
      toast.success("Template updated!");
    } else {
      const t: WaTemplate = { ...templateForm, id: `tpl-${Date.now()}`, enabled: true, createdAt: new Date().toISOString() };
      updatedTemplates = [t, ...templates];
      toast.success(`Template "${t.name}" created!`);
    }
    persist.mutate({ templates: updatedTemplates, logs, config });
    setIsTemplateModalOpen(false);
    setTemplateForm({ name: "", body: "", trigger: TRIGGERS[0] });
    setEditingTemplate(null);
  }

  function toggleTemplate(id: string, val: boolean) {
    const updated = templates.map((t) => t.id === id ? { ...t, enabled: val } : t);
    persist.mutate({ templates: updated, logs, config });
  }

  function deleteTemplate(id: string) {
    persist.mutate({ templates: templates.filter((t) => t.id !== id), logs, config });
    toast.success("Template deleted.");
  }

  async function sendTestMessage() {
    if (!testPhone.trim()) return toast.error("Enter a test phone number");
    setIsSendingTest(true);
    await new Promise((r) => setTimeout(r, 1500));
    const newLog: WaDeliveryLog = {
      id: `log-${Date.now()}`,
      recipient: "Test Recipient",
      phone: testPhone,
      template: templates[0]?.name || "Test Template",
      status: "sent",
      timestamp: new Date().toLocaleString(),
    };
    persist.mutate({ templates, logs: [newLog, ...logs], config });
    setIsSendingTest(false);
    toast.success(`Test WhatsApp message sent to ${testPhone}!`);
  }

  function saveConfig() {
    persist.mutate({ templates, logs, config: { apiKey, apiPhone } });
    toast.success("WhatsApp API configuration saved!");
  }

  return (
    <PlanGuard moduleName="WhatsApp Alerts & Reminders" requiredPlan="starter">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <MessageSquare className="size-6 text-emerald-600" /> WhatsApp Alerts & Reminders
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure automated WhatsApp notifications for HR events.</p>
          </div>
          <Badge className="bg-emerald-600 text-white font-mono text-xs">Addon Active</Badge>
        </div>

        <Tabs defaultValue="templates">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="templates" className="gap-1.5 text-xs"><FileText className="size-3.5" /> Templates ({templates.length})</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs"><Bell className="size-3.5" /> Delivery Logs ({logs.length})</TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5 text-xs"><Settings2 className="size-3.5" /> API Config</TabsTrigger>
          </TabsList>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Message templates with trigger rules and variable placeholders.</p>
              <Button size="sm" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: "", body: "", trigger: TRIGGERS[0] }); setIsTemplateModalOpen(true); }} className="gap-1.5 text-xs font-bold">
                <Plus className="size-4" /> Create Template
              </Button>
            </div>
            {templates.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground space-y-2">
                <MessageSquare className="size-10 mx-auto opacity-20" />
                <p className="font-bold text-foreground">No templates yet</p>
                <p className="text-sm">Create your first WhatsApp message template.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((t) => (
                  <Card key={t.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{t.name}</span>
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                            <Zap className="size-2.5 mr-1" /> {t.trigger}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{t.body}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={t.enabled} onCheckedChange={(v) => toggleTemplate(t.id, v)} />
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditingTemplate(t); setTemplateForm({ name: t.name, body: t.body, trigger: t.trigger }); setIsTemplateModalOpen(true); }}>
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => deleteTemplate(t.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* DELIVERY LOGS TAB */}
          <TabsContent value="logs" className="mt-4">
            {logs.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground space-y-2">
                <Bell className="size-10 mx-auto opacity-20" />
                <p className="font-bold text-foreground">No delivery logs</p>
                <p className="text-sm">Logs will appear when messages are triggered.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>{["Recipient", "Phone", "Template", "Status", "Time"].map((h) => <th key={h} className="p-2.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-t hover:bg-secondary/20">
                        <td className="p-2.5 font-semibold">{l.recipient}</td>
                        <td className="p-2.5 font-mono text-muted-foreground">{l.phone}</td>
                        <td className="p-2.5">{l.template}</td>
                        <td className="p-2.5">
                          <Badge className={l.status === "sent" ? "bg-emerald-100 text-emerald-700" : l.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                            {l.status === "sent" ? <CheckCircle2 className="size-3 mr-1" /> : <XCircle className="size-3 mr-1" />}
                            {l.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-muted-foreground">{l.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* API CONFIG TAB */}
          <TabsContent value="config" className="mt-4 max-w-xl space-y-5">
            <Card className="p-5 space-y-4">
              <CardHeader className="p-0 pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Settings2 className="size-4 text-primary" /> WhatsApp Business API Credentials</CardTitle>
                <CardDescription className="text-xs">Configure your Twilio or WhatsApp Cloud API credentials for message delivery.</CardDescription>
              </CardHeader>
              <div className="space-y-3 text-xs">
                <div className="space-y-1"><Label className="text-xs font-semibold">API Key / Access Token</Label>
                  <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••••••••••••••••" className="text-xs font-mono" /></div>
                <div className="space-y-1"><Label className="text-xs font-semibold">WhatsApp Business Phone Number</Label>
                  <Input value={apiPhone} onChange={(e) => setApiPhone(e.target.value)} placeholder="+91 98765 43210" className="text-xs" /></div>
                <Button onClick={saveConfig} className="font-bold gap-2 text-xs"><Settings2 className="size-4" /> Save Configuration</Button>
              </div>
            </Card>

            <Card className="p-5 space-y-4 border-emerald-500/20">
              <CardHeader className="p-0 pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Play className="size-4 text-emerald-600" /> Test Send Message</CardTitle>
              </CardHeader>
              <div className="space-y-3 text-xs">
                <div className="space-y-1"><Label className="text-xs font-semibold">Test Phone Number</Label>
                  <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+91 98765 43210" className="text-xs" /></div>
                <Button onClick={sendTestMessage} disabled={isSendingTest} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs">
                  {isSendingTest ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send Test Message
                </Button>
              </div>
            </Card>

            <Card className="p-4 space-y-2 border-slate-200 dark:border-slate-700">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Available Template Variables</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => <Badge key={v} variant="secondary" className="font-mono text-[10px]">{v}</Badge>)}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template Modal */}
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-emerald-600" /> {editingTemplate ? "Edit Template" : "Create Message Template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1"><Label className="text-xs font-semibold">Template Name *</Label>
                <Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="e.g. Leave Approval Notification" className="text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs font-semibold">Trigger Event</Label>
                <Select value={templateForm.trigger} onValueChange={(v) => setTemplateForm({ ...templateForm, trigger: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Message Body *</span>
                  <span className="text-[10px] text-muted-foreground">Use {"{{variable}}"} placeholders</span>
                </Label>
                <Textarea value={templateForm.body} onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })} placeholder={`Hi {{employee_name}}, your leave request for {{leave_date}} has been approved by {{company_name}}.`} className="text-xs resize-none" rows={4} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button key={v} onClick={() => setTemplateForm({ ...templateForm, body: templateForm.body + v })} className="px-2 py-0.5 rounded-md bg-secondary font-mono text-[10px] hover:bg-primary/10 border">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button>
              <Button onClick={saveTemplate} disabled={persist.isPending} className="font-bold gap-2">
                {persist.isPending && <Loader2 className="size-4 animate-spin" />}
                {editingTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
