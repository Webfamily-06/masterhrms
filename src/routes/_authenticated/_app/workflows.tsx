import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Workflow,
  Zap,
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";

export const Route = createFileRoute("/_authenticated/_app/workflows")({
  component: WorkflowsPage,
  head: () => ({ meta: [{ title: "Automation Rules & Workflows — Master HRMS" }] }),
});

export type AutomationRule = {
  id: string;
  name: string;
  triggerEvent: "leave_submitted" | "expense_submitted" | "candidate_hired" | "ticket_created" | "resignation_filed";
  condition: string;
  actionType: "escalate_to_director" | "send_slack_alert" | "create_it_ticket" | "auto_issue_certificate";
  actionDescription: string;
  isActive: boolean;
  executionCount: number;
  lastExecutedAt?: string;
};

export type ExecutionLog = {
  id: string;
  ruleName: string;
  triggerEvent: string;
  entityDetails: string;
  status: "Success" | "Escalated" | "Failed";
  executedAt: string;
};

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: "wf-1",
    name: "Auto-Escalate High-Value Expense Claims",
    triggerEvent: "expense_submitted",
    condition: "Claim Amount > ₹15,000",
    actionType: "escalate_to_director",
    actionDescription: "Auto-escalate for Finance Director expedited review & approval",
    isActive: true,
    executionCount: 14,
    lastExecutedAt: "Yesterday, 4:15 PM",
  },
  {
    id: "wf-2",
    name: "Urgent Helpdesk SLA Auto-Escalation",
    triggerEvent: "ticket_created",
    condition: "Priority == 'Critical' && Unassigned > 2 hours",
    actionType: "escalate_to_director",
    actionDescription: "Auto-assign to Tier-3 Operations Lead & send urgent push alert",
    isActive: true,
    executionCount: 6,
    lastExecutedAt: "Today, 11:30 AM",
  },
  {
    id: "wf-3",
    name: "New Hire IT Hardware Provisioning",
    triggerEvent: "candidate_hired",
    condition: "Status changed to 'Offer Accepted'",
    actionType: "create_it_ticket",
    actionDescription: "Auto-create IT Asset Request for workstation laptop & ID badge",
    isActive: true,
    executionCount: 8,
    lastExecutedAt: "3 days ago",
  },
  {
    id: "wf-4",
    name: "Extended Sick Leave Medical Certificate Alert",
    triggerEvent: "leave_submitted",
    condition: "Leave Type == 'Sick Leave' && Days > 3",
    actionType: "send_slack_alert",
    actionDescription: "Send automated WhatsApp/Email notification requesting medical fit certificate",
    isActive: true,
    executionCount: 21,
    lastExecutedAt: "Today, 9:45 AM",
  },
];

const DEFAULT_LOGS: ExecutionLog[] = [
  {
    id: "log-1",
    ruleName: "Urgent Helpdesk SLA Auto-Escalation",
    triggerEvent: "ticket_created",
    entityDetails: "Ticket #TKT-2026-089 (Server Outage)",
    status: "Escalated",
    executedAt: "Today, 11:30 AM",
  },
  {
    id: "log-2",
    ruleName: "Auto-Escalate High-Value Expense Claims",
    triggerEvent: "expense_submitted",
    entityDetails: "Claim #EXP-772 (Client Travel - ₹34,500)",
    status: "Success",
    executedAt: "Yesterday, 4:15 PM",
  },
  {
    id: "log-3",
    ruleName: "Extended Sick Leave Medical Certificate Alert",
    triggerEvent: "leave_submitted",
    entityDetails: "Leave #LV-449 (4 Days Medical Leave)",
    status: "Success",
    executedAt: "Yesterday, 9:45 AM",
  },
  {
    id: "log-4",
    ruleName: "New Hire IT Hardware Provisioning",
    triggerEvent: "candidate_hired",
    entityDetails: "Candidate: Priya Sharma (Sr Frontend Eng)",
    status: "Success",
    executedAt: "3 days ago",
  },
];

export function WorkflowsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("rules");
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);

  // Form State
  const [ruleForm, setRuleForm] = useState({
    name: "",
    triggerEvent: "expense_submitted" as AutomationRule["triggerEvent"],
    condition: "Amount > ₹15,000",
    actionType: "escalate_to_director" as AutomationRule["actionType"],
    actionDescription: "Auto-escalate for managerial review",
  });

  // Query Workflows Data (Rules & Logs)
  const { data: storeData } = useQuery<{ rules: AutomationRule[]; logs: ExecutionLog[] }>({
    queryKey: ["tenant-automation-rules", tenantId],
    queryFn: async () => {
      try {
        const page = await api.get(`/cms/pages/tenant-${tenantId}-automation-rules`);
        if (page?.content) {
          const c = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
          if (Array.isArray(c)) {
            return { rules: c, logs: DEFAULT_LOGS };
          }
          return {
            rules: c.rules || DEFAULT_RULES,
            logs: c.logs || DEFAULT_LOGS,
          };
        }
        return { rules: DEFAULT_RULES, logs: DEFAULT_LOGS };
      } catch {
        return { rules: DEFAULT_RULES, logs: DEFAULT_LOGS };
      }
    },
  });

  const rules = storeData?.rules || DEFAULT_RULES;
  const logs = storeData?.logs || DEFAULT_LOGS;

  const saveMutation = useMutation({
    mutationFn: async (payload: { rules: AutomationRule[]; logs: ExecutionLog[] }) => {
      await api.put(`/cms/pages/tenant-${tenantId}-automation-rules`, {
        title: "Tenant Automation Rules",
        content: payload,
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-automation-rules", tenantId] });
      setIsAddRuleOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCreateRule() {
    if (!ruleForm.name.trim()) return toast.error("Rule name is required");

    const newRule: AutomationRule = {
      id: `wf-${Date.now()}`,
      name: ruleForm.name.trim(),
      triggerEvent: ruleForm.triggerEvent,
      condition: ruleForm.condition,
      actionType: ruleForm.actionType,
      actionDescription: ruleForm.actionDescription,
      isActive: true,
      executionCount: 0,
      lastExecutedAt: "Never",
    };

    saveMutation.mutate({ rules: [newRule, ...rules], logs });
    toast.success("Workflow rule saved and activated!");
  }

  function toggleRuleActive(ruleId: string) {
    const updated = rules.map((r) => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r));
    saveMutation.mutate({ rules: updated, logs });
    toast.success("Rule status updated.");
  }

  function handleDeleteRule(ruleId: string) {
    const updated = rules.filter((r) => r.id !== ruleId);
    saveMutation.mutate({ rules: updated, logs });
    toast.success("Rule deleted.");
  }

  function handleTriggerTest(rule: AutomationRule) {
    const newLog: ExecutionLog = {
      id: `log-${Date.now()}`,
      ruleName: rule.name,
      triggerEvent: rule.triggerEvent,
      entityDetails: `Manual Test Execution (${rule.condition})`,
      status: rule.actionType === "escalate_to_director" ? "Escalated" : "Success",
      executedAt: "Just now",
    };

    const updatedRules = rules.map((r) =>
      r.id === rule.id
        ? {
            ...r,
            executionCount: r.executionCount + 1,
            lastExecutedAt: "Just now",
          }
        : r
    );

    const updatedLogs = [newLog, ...logs];
    saveMutation.mutate({ rules: updatedRules, logs: updatedLogs });
    toast.success(`⚡ Action executed: ${rule.actionDescription}`);
  }

  return (
    <PlanGuard moduleName="Automation Workflows" requiredPlan="free">
      <div className="space-y-6 max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Workflow className="size-6 text-primary" /> Event-Driven Automation & Workflows Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Build IF-THIS-THEN-THAT approval chains, auto-escalate high-value claims, and trigger background tasks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsAddRuleOpen(true)}
              className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground shadow-xs"
            >
              <Plus className="size-3.5" /> Create Automation Rule
            </Button>
          </div>
        </div>

        {/* Tab Selector */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full sm:w-[380px] h-10 bg-secondary/50 p-1 border">
            <TabsTrigger value="rules" className="text-xs font-bold gap-2">
              <Workflow className="size-3.5" /> Active Rules ({rules.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs font-bold gap-2">
              <Play className="size-3.5 text-emerald-500" /> Execution History ({logs.length})
            </TabsTrigger>
          </TabsList>

          {/* ===================== TAB 1: RULES ===================== */}
          <TabsContent value="rules" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {rules.map((rule) => (
                <Card key={rule.id} className="p-5 border space-y-4 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {rule.triggerEvent}
                      </Badge>
                      <Badge
                        className={`text-[10px] font-bold ${
                          rule.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {rule.isActive ? "Active Rule" : "Paused"}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-foreground leading-snug">{rule.name}</h3>
                      <div className="mt-2 p-2.5 rounded-lg border bg-secondary/20 space-y-1 text-xs">
                        <div className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
                          <span className="font-bold text-foreground">IF:</span> {rule.condition}
                        </div>
                        <div className="text-primary flex items-center gap-1 font-mono text-[11px]">
                          <span className="font-bold text-foreground">THEN:</span> {rule.actionDescription}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-muted-foreground text-[10px]">{rule.executionCount} Runs</div>
                      <div className="text-[9px] text-muted-foreground truncate">{rule.lastExecutedAt}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTriggerTest(rule)}
                        className="h-7 text-[11px] font-bold gap-1 text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10"
                        title="Simulate Event & Execute Rule"
                      >
                        <Play className="size-3" /> Run Test
                      </Button>
                      <Button
                        size="sm"
                        variant={rule.isActive ? "outline" : "secondary"}
                        onClick={() => toggleRuleActive(rule.id)}
                        className="h-7 text-[11px] font-bold"
                      >
                        {rule.isActive ? "Pause" : "Enable"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="size-7 text-destructive hover:bg-destructive/10"
                        title="Delete Rule"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ===================== TAB 2: EXECUTION LOGS ===================== */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40">
                      <TableHead className="text-xs">Rule Name</TableHead>
                      <TableHead className="text-xs">Trigger</TableHead>
                      <TableHead className="text-xs">Target Entity Details</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-secondary/20">
                        <TableCell className="font-bold text-xs">{log.ruleName}</TableCell>
                        <TableCell className="font-mono text-xs text-primary">{log.triggerEvent}</TableCell>
                        <TableCell className="text-xs">{log.entityDetails}</TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] font-bold ${
                              log.status === "Success"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right text-muted-foreground">
                          {log.executedAt}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ===================== MODAL: CREATE RULE ===================== */}
        <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Workflow className="size-5 text-primary" /> Create Automation Workflow Rule
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Rule Title *</Label>
                <Input
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="e.g. Auto-Notify Finance on High Expense"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Trigger Event</Label>
                <Select
                  value={ruleForm.triggerEvent}
                  onValueChange={(v: any) => setRuleForm({ ...ruleForm, triggerEvent: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense_submitted">On Expense Claim Submitted</SelectItem>
                    <SelectItem value="leave_submitted">On Leave Request Filed</SelectItem>
                    <SelectItem value="candidate_hired">On Candidate Marked Hired</SelectItem>
                    <SelectItem value="ticket_created">On Support Ticket Created</SelectItem>
                    <SelectItem value="resignation_filed">On Resignation Submitted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Condition Logic</Label>
                <Input
                  value={ruleForm.condition}
                  onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })}
                  placeholder="e.g. Amount > ₹20,000 or Days > 5"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Action to Execute</Label>
                <Select
                  value={ruleForm.actionType}
                  onValueChange={(v: any) => setRuleForm({ ...ruleForm, actionType: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escalate_to_director">Escalate for Multi-Level Sign-off</SelectItem>
                    <SelectItem value="send_slack_alert">Send Instant Slack / Webhook Alert</SelectItem>
                    <SelectItem value="create_it_ticket">Auto-Create IT Provisioning Ticket</SelectItem>
                    <SelectItem value="auto_issue_certificate">Auto-Issue Verifiable Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateRule} className="font-bold bg-primary text-primary-foreground">
                Save & Activate Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
