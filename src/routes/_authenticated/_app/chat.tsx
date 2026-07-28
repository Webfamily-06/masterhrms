import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Users, Sparkles, UserCheck } from "lucide-react";
import { PlanGuard } from "@/components/plan-guard";

export const Route = createFileRoute("/_authenticated/_app/chat")({
  component: TeamChatPage,
  head: () => ({ meta: [{ title: "Team Chat — Master ERP" }] }),
});

const INITIAL_MESSAGES = [
  { id: "1", sender: "Anand Sharma", text: "Team, the Q3 payroll calculations are ready for review.", time: "10:14 AM", isMe: false },
  { id: "2", sender: "Priya Patel", text: "Awesome! I've approved all pending leave requests for the engineering dept.", time: "10:16 AM", isMe: false },
  { id: "3", sender: "You", text: "Great work! Also the new POS terminal is live at Branch 1.", time: "10:20 AM", isMe: true },
];

function TeamChatPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputMsg, setInputMsg] = useState("");

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const msg = {
      id: Date.now().toString(),
      sender: "You",
      text: inputMsg,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    };
    setMessages([...messages, msg]);
    setInputMsg("");
  }

  return (
    <PlanGuard moduleName="Team Internal Chat" requiredPlan="starter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <MessageSquare className="size-6 text-primary" /> Team Internal Chat
            </h1>
            <p className="text-xs text-muted-foreground">Real-time team messaging, project channel updates & internal staff communication.</p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            Free Addon Active
          </Badge>
        </div>

        {/* Chat Interface Container */}
        <Card className="shadow-lg border-primary/20 max-w-4xl mx-auto overflow-hidden">
          <CardHeader className="p-4 border-b bg-secondary/30 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-sm">#general-team-workspace</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">4 Staff Online</span>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Messages Scroll Area */}
            <div className="space-y-3 min-h-[350px] max-h-[450px] overflow-y-auto p-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1 font-mono">
                    <span>{m.sender}</span>
                    <span>·</span>
                    <span>{m.time}</span>
                  </div>
                  <div
                    className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      m.isMe ? "bg-primary text-primary-foreground font-medium rounded-tr-xs shadow-sm" : "bg-secondary text-foreground rounded-tl-xs border"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Box */}
            <form onSubmit={sendMessage} className="flex gap-2 pt-2 border-t">
              <Input
                placeholder="Type a team message or update..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                className="flex-1 text-xs"
              />
              <Button type="submit" size="default" className="font-bold gap-1.5 shrink-0">
                <Send className="size-3.5" /> Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PlanGuard>
  );
}
