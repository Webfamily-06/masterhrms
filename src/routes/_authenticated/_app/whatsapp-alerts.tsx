import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
  Loader2, Bell, Zap, FileText, Edit2, Play, Bot, Copy, RefreshCw,
  Terminal, ShieldCheck, ArrowRight, CornerDownLeft
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/whatsapp-alerts")({
  component: WhatsAppAlertsPage,
  head: () => ({ meta: [{ title: "WhatsApp Alerts & Bot Engine — Master HRMS" }] }),
});

type WaTemplate = {
  id: string;
  name: string;
  body: string;
  trigger: string;
  enabled: boolean;
  createdAt: string;
};

type BotRule = {
  id: string;
  keyword: string;
  replyText: string;
  action: "reply_text" | "send_payslip" | "send_leave_balance" | "check_in_status";
  enabled: boolean;
};

type WaDeliveryLog = {
  id: string;
  recipient: string;
  template: string;
  status: "sent" | "failed" | "pending";
  timestamp: string;
  phone: string;
  direction?: "outbound" | "inbound";
};

const TRIGGERS = [
  "Leave Approved", "Leave Rejected", "Invoice Due", "Invoice Paid",
  "Attendance Late", "Attendance Absent", "Salary Slip Generated",
  "Task Assigned", "Payroll Processed", "Subscription Expiry",
];

const DEFAULT_BOT_RULES: BotRule[] = [
  {
    id: "bot-1",
    keyword: "PAYSLIP",
    replyText: "📄 Here is your latest salary payslip for this month. Download PDF: https://masterhrms.com/payslips/download-latest",
    action: "send_payslip",
    enabled: true,
  },
  {
    id: "bot-2",
    keyword: "LEAVE",
    replyText: "🌴 You currently have 12 Paid Leaves and 5 Casual Leaves available. Apply on app: https://masterhrms.com/leave",
    action: "send_leave_balance",
    enabled: true,
  },
  {
    id: "bot-3",
    keyword: "ATTENDANCE",
    replyText: "⏰ Today's Check-in Status: Checked In at 09:15 AM (Verified via Biometric Hardware Scanner).",
    action: "check_in_status",
    enabled: true,
  },
  {
    id: "bot-4",
    keyword: "HELP",
    replyText: "👋 Master HRMS WhatsApp Assistant! Reply with: \n1. PAYSLIP - Get latest payslip\n2. LEAVE - Check leave balance\n3. ATTENDANCE - Today's check-in status",
    action: "reply_text",
    enabled: true,
  },
];

function WhatsAppAlertsPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const SLUG = `system-whatsapp-alerts-${tenantId}`;

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WaTemplate | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiPhone, setApiPhone] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Inbound Bot Simulator
  const [simKeyword, setSimKeyword] = useState("PAYSLIP");
  const [simChatHistory, setSimChatHistory] = useState<{ sender: "user" | "bot"; text: string; time: string }[]>([
    { sender: "bot", text: "👋 Hi! Master HRMS Inbound WhatsApp Bot is Active. Type PAYSLIP, LEAVE, or ATTENDANCE.", time: "10:00 AM" },
  ]);

  const [templateForm, setTemplateForm] = useState({ name: "", body: "", trigger: TRIGGERS[0] });
  const [botForm, setBotForm] = useState<BotRule>({ id: "", keyword: "", replyText: "", action: "reply_text", enabled: true });

  const { data: storeData } = useQuery({
    queryKey: ["whatsapp-alerts", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", SLUG).maybeSingle();
      if (data?.content) {
        const p = data.content as any;
        return {
          templates: (p.templates || []) as WaTemplate[],
          botRules: (p.botRules || DEFAULT_BOT_RULES) as BotRule[],
          logs: (p.logs || []) as WaDeliveryLog[],
          config: p.config || {},
        };
      }
      return { templates: [] as WaTemplate[], botRules: DEFAULT_BOT_RULES, logs: [] as WaDeliveryLog[], config: {} };
    },
  });

  const templates = storeData?.templates ?? [];
  const botRules = storeData?.botRules ?? DEFAULT_BOT_RULES;
  const logs = storeData?.logs ?? [];
  const config = storeData?.config ?? {};

  const persist = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase
        .from("cms_pages")
        .upsert({ slug: SLUG, title: "WhatsApp Alerts Config", content: payload, published: true }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-alerts", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function saveTemplate() {
    if (!templateForm.name.trim() || !templateForm.body.trim()) return toast.error("Name and body required");
    let updatedTemplates: WaTemplate[];
    if (editingTemplate) {
      updatedTemplates = templates.map((t) => (t.id === editingTemplate.id ? { ...editingTemplate, ...templateForm } : t));
      toast.success("Template updated!");
    } else {
      const t: WaTemplate = { ...templateForm, id: `tpl-${Date.now()}`, enabled: true, createdAt: new Date().toISOString() };
      updatedTemplates = [t, ...templates];
      toast.success(`Template "${t.name}" created!`);
    }
    persist.mutate({ templates: updatedTemplates, botRules, logs, config });
    setIsTemplateModalOpen(false);
    setTemplateForm({ name: "", body: "", trigger: TRIGGERS[0] });
    setEditingTemplate(null);
  }

  function saveBotRule() {
    if (!botForm.keyword.trim() || !botForm.replyText.trim()) return toast.error("Keyword and reply text are required");
    const newRule: BotRule = {
      ...botForm,
      id: botForm.id || `bot-${Date.now()}`,
      keyword: botForm.keyword.trim().toUpperCase(),
    };
    const updated = [newRule, ...botRules.filter((r) => r.id !== newRule.id)];
    persist.mutate({ templates, botRules: updated, logs, config });
    setIsBotModalOpen(false);
    setBotForm({ id: "", keyword: "", replyText: "", action: "reply_text", enabled: true });
    toast.success(`WhatsApp Bot Keyword "${newRule.keyword}" saved!`);
  }

  function toggleTemplate(id: string, val: boolean) {
    const updated = templates.map((t) => (t.id === id ? { ...t, enabled: val } : t));
    persist.mutate({ templates, botRules, logs: updated, config });
  }

  function deleteTemplate(id: string) {
    persist.mutate({ templates: templates.filter((t) => t.id !== id), botRules, logs, config });
    toast.success("Template deleted.");
  }

  function deleteBotRule(id: string) {
    const updated = botRules.filter((r) => r.id !== id);
    persist.mutate({ templates, botRules: updated, logs, config });
    toast.success("Bot keyword rule deleted.");
  }

  async function sendTestMessage() {
    if (!testPhone.trim()) return toast.error("Enter a test phone number");
    setIsSendingTest(true);
    await new Promise((r) => setTimeout(r, 1200));
    const newLog: WaDeliveryLog = {
      id: `log-${Date.now()}`,
      recipient: "Test Recipient",
      phone: testPhone,
      template: templates[0]?.name || "Outbound Alert",
      status: "sent",
      timestamp: new Date().toLocaleString(),
      direction: "outbound",
    };
    persist.mutate({ templates, botRules, logs: [newLog, ...logs], config });
    setIsSendingTest(false);
    toast.success(`Test WhatsApp message sent to ${testPhone}!`);
  }

  // Simulate Inbound Bot Reply
  function handleSimulateBotMessage() {
    if (!simKeyword.trim()) return;
    const kw = simKeyword.trim().toUpperCase();
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // User message
    const userMsg = { sender: "user" as const, text: kw, time: timeStr };

    // Find matching bot rule
    const matchedRule = botRules.find((r) => r.enabled && r.keyword.toUpperCase() === kw);
    const replyText = matchedRule
      ? matchedRule.replyText
      : `🤖 Sorry, I didn't recognize "${kw}". Type HELP to see available commands.`;

    const botMsg = { sender: "bot" as const, text: replyText, time: timeStr };

    setSimChatHistory((prev) => [...prev, userMsg, botMsg]);
    setSimKeyword("");

    // Add log
    const inboundLog: WaDeliveryLog = {
      id: `log-in-${Date.now()}`,
      recipient: "Inbound User",
      phone: "+91 98765 43210",
      template: `Bot Reply (${kw})`,
      status: "sent",
      timestamp: new Date().toLocaleString(),
      direction: "inbound",
    };
    persist.mutate({ templates, botRules, logs: [inboundLog, ...logs], config });
  }

  const webhookUrl = `https://masterhrms.com/api/v1/whatsapp/webhook/${tenantId}`;

  return (
    <PlanGuard moduleName="WhatsApp Alerts & Reminders" requiredPlan="starter">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <MessageSquare className="size-6 text-emerald-600" /> WhatsApp Alerts & Bot Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Automated outbound alerts & interactive inbound WhatsApp bot auto-responder.</p>
          </div>
          <Badge className="bg-emerald-600 text-white font-mono text-xs">Addon Active</Badge>
        </div>

        <Tabs defaultValue="bot">
          <TabsList className="w-full sm:w-auto flex-wrap">
            <TabsTrigger value="bot" className="gap-1.5 text-xs">
              <Bot className="size-3.5" /> Inbound Bot Webhook ({botRules.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 text-xs">
              <FileText className="size-3.5" /> Outbound Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs">
              <Bell className="size-3.5" /> Delivery Logs ({logs.length})
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5 text-xs">
              <Settings2 className="size-3.5" /> API Credentials
            </TabsTrigger>
          </TabsList>

          {/* INBOUND BOT WEBHOOK TAB */}
          <TabsContent value="bot" className="mt-4 space-y-5">
            {/* Webhook Endpoint Banner */}
            <Card className="p-4 bg-emerald-500/10 border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                  <Bot className="size-4 text-emerald-600" /> Inbound Webhook Endpoint
                </div>
                <Badge className="bg-emerald-600 text-white font-mono text-[10px]">ACTIVE WEBHOOK</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Set this Webhook URL in your Twilio / Meta WhatsApp Business API Dashboard to process incoming messages automatically.
              </p>
              <div className="flex items-center gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-xs bg-background h-8" />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs shrink-0 font-bold"
                  onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Webhook URL copied to clipboard!"); }}
                >
                  <Copy className="size-3.5" /> Copy URL
                </Button>
              </div>
            </Card>

            <div className="grid md:grid-cols-3 gap-5">
              {/* Bot Keyword Rules List */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-sm flex items-center gap-2">
                    <Terminal className="size-4 text-emerald-600" /> Auto-Responder Keyword Rules
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => { setBotForm({ id: "", keyword: "", replyText: "", action: "reply_text", enabled: true }); setIsBotModalOpen(true); }}
                    className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="size-4" /> Add Keyword Rule
                  </Button>
                </div>

                <div className="space-y-3">
                  {botRules.map((rule) => (
                    <Card key={rule.id} className="p-4 space-y-2 border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary text-primary-foreground font-mono text-xs font-black">
                              KEYWORDS: {rule.keyword}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {rule.action.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono whitespace-pre-line bg-secondary/40 p-2 rounded-md border mt-1">
                            {rule.replyText}
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" className="size-7 text-destructive shrink-0" onClick={() => deleteBotRule(rule.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Live Interactive WhatsApp Simulator */}
              <Card className="p-4 border space-y-3 flex flex-col justify-between h-[450px]">
                <CardHeader className="p-0 pb-2 border-b">
                  <CardTitle className="text-xs font-extrabold flex items-center gap-2">
                    <MessageSquare className="size-4 text-emerald-600" /> WhatsApp Bot Simulator
                  </CardTitle>
                  <CardDescription className="text-[10px]">Test inbound keyword auto-replies live.</CardDescription>
                </CardHeader>

                <div className="flex-1 overflow-y-auto space-y-2 p-2 rounded-xl bg-slate-900 text-white text-xs font-sans">
                  {simChatHistory.map((chat, idx) => (
                    <div key={idx} className={`flex flex-col ${chat.sender === "user" ? "items-end" : "items-start"}`}>
                      <div className={`p-2.5 rounded-xl max-w-[85%] ${chat.sender === "user" ? "bg-emerald-600 text-white rounded-br-none" : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700"}`}>
                        <div className="whitespace-pre-line text-[11px]">{chat.text}</div>
                        <div className="text-[9px] opacity-60 text-right mt-1 font-mono">{chat.time}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={simKeyword}
                    onChange={(e) => setSimKeyword(e.target.value)}
                    placeholder="Type keyword (e.g. PAYSLIP)..."
                    className="h-8 text-xs font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleSimulateBotMessage()}
                  />
                  <Button size="sm" onClick={handleSimulateBotMessage} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0">
                    Send
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Message templates with trigger rules and variable placeholders.</p>
              <Button size="sm" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: "", body: "", trigger: TRIGGERS[0] }); setIsTemplateModalOpen(true); }} className="gap-1.5 text-xs font-bold">
                <Plus className="size-4" /> Create Template
              </Button>
            </div>
            {templates.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground space-y-2 border rounded-2xl bg-secondary/10">
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
              <div className="py-20 text-center text-muted-foreground space-y-2 border rounded-2xl bg-secondary/10">
                <Bell className="size-10 mx-auto opacity-20" />
                <p className="font-bold text-foreground">No delivery logs</p>
                <p className="text-sm">Logs will appear when messages are triggered or received.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>{["Direction", "Recipient / Sender", "Phone", "Template / Trigger", "Status", "Time"].map((h) => <th key={h} className="p-2.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-t hover:bg-secondary/20">
                        <td className="p-2.5">
                          <Badge variant={l.direction === "inbound" ? "secondary" : "outline"} className="text-[10px]">
                            {l.direction === "inbound" ? "📥 INBOUND BOT" : "📤 OUTBOUND"}
                          </Badge>
                        </td>
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
            <Card className="p-5 space-y-4 border">
              <CardHeader className="p-0 pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Settings2 className="size-4 text-primary" /> WhatsApp Business API Credentials</CardTitle>
                <CardDescription className="text-xs">Configure your Twilio or WhatsApp Cloud API credentials for message delivery.</CardDescription>
              </CardHeader>
              <div className="space-y-3 text-xs">
                <div className="space-y-1"><Label className="text-xs font-semibold">API Key / Access Token</Label><Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="EAAGxxxxxxxx" className="text-xs font-mono" /></div>
                <div className="space-y-1"><Label className="text-xs font-semibold">Sender Phone Number ID</Label><Input value={apiPhone} onChange={(e) => setApiPhone(e.target.value)} placeholder="+14155238886" className="text-xs font-mono" /></div>
                <Button onClick={() => { persist.mutate({ templates, botRules, logs, config: { apiKey, apiPhone } }); toast.success("WhatsApp API credentials saved!"); }} className="font-bold text-xs">Save Credentials</Button>
              </div>
            </Card>

            <Card className="p-5 space-y-3 border">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Send className="size-4 text-emerald-600" /> Send Test Message</CardTitle>
              </CardHeader>
              <div className="flex gap-2">
                <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+919876543210" className="text-xs font-mono" />
                <Button onClick={sendTestMessage} disabled={isSendingTest} className="font-bold text-xs shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                  {isSendingTest ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Send Test
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Bot Rule Modal */}
        <Dialog open={isBotModalOpen} onOpenChange={setIsBotModalOpen}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="size-5 text-emerald-600" /> Add WhatsApp Bot Keyword Rule
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Trigger Keyword *</Label>
                <Input value={botForm.keyword} onChange={(e) => setBotForm({ ...botForm, keyword: e.target.value })} placeholder="e.g. PAYSLIP, LEAVE, SALARY" className="text-xs font-mono uppercase" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Automated Reply Message *</Label>
                <Textarea rows={4} value={botForm.replyText} onChange={(e) => setBotForm({ ...botForm, replyText: e.target.value })} placeholder="Enter automated WhatsApp response text..." className="text-xs font-mono" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBotModalOpen(false)}>Cancel</Button>
              <Button onClick={saveBotRule} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Save Keyword Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
