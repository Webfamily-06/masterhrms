import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LifeBuoy, Plus, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/support")({
  component: SupportPage,
  head: () => ({ meta: [{ title: "Support Tickets — Master ERP" }] }),
});

const INITIAL_TICKETS = [
  { id: "TCK-8801", subject: "Biometric attendance sync delay on Branch 2", priority: "high", status: "open", created: "2026-07-28 09:30" },
  { id: "TCK-8802", subject: "Custom GST Form 16 PDF template query", priority: "medium", status: "resolved", created: "2026-07-26 14:15" },
  { id: "TCK-8803", subject: "Requesting additional user seat quota", priority: "low", status: "in_progress", created: "2026-07-25 11:00" },
];

function SupportPage() {
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");

  function createTicket() {
    if (!subject || !message) return toast.error("Please fill in subject and description");
    const newTck = {
      id: `TCK-${Math.floor(8800 + Math.random() * 100)}`,
      subject,
      priority,
      status: "open",
      created: new Date().toLocaleString(),
    };
    setTickets([newTck, ...tickets]);
    toast.success(`Support Ticket "${newTck.id}" submitted to Helpdesk SLA!`);
    setSubject("");
    setMessage("");
  }

  return (
    <PlanGuard moduleName="Tenant Support Tickets" requiredPlan="free">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <LifeBuoy className="size-6 text-primary" /> Tenant Support Helpdesk
            </h1>
            <p className="text-xs text-muted-foreground">Submit tech support tickets, request ERP customisation & track SLA responses.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={tickets.length} limit={20} label="Active Support Tickets" />
          </div>
        </div>

        {/* Form & Tickets Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* New Ticket Form */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="text-base">Submit Ticket</CardTitle>
              <CardDescription className="text-xs">Direct 24/7 channel to ERP solution engineers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Subject / Issue *</label>
                <Input placeholder="e.g. Need assistance with Tally import" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Priority Level</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Standard</SelectItem>
                    <SelectItem value="high font-bold text-red-500">High Urgent SLA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Detailed Message *</label>
                <Textarea placeholder="Describe the steps, error logs or help needed..." rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="text-xs resize-none" />
              </div>

              <Button size="lg" onClick={createTicket} className="w-full font-bold gap-2">
                <Plus className="size-4" /> Submit Ticket
              </Button>
            </CardContent>
          </Card>

          {/* Ticket History */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle className="text-base">Ticket History ({tickets.length})</CardTitle>
              <CardDescription className="text-xs">Live tracking of active and resolved tickets.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y text-xs">
                {tickets.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary">{t.id}</span>
                        <Badge variant="outline" className="text-[9px] capitalize font-mono">
                          {t.priority}
                        </Badge>
                      </div>
                      <p className="font-bold text-foreground text-xs leading-snug">{t.subject}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{t.created}</p>
                    </div>

                    <Badge
                      className={`text-[9px] font-mono capitalize shrink-0 ${
                        t.status === "resolved" ? "bg-emerald-500 text-white" : t.status === "in_progress" ? "bg-amber-500 text-white" : "bg-primary text-white"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PlanGuard>
  );
}
