import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  HelpCircle,
  Mail,
  MessageSquare,
  BookOpen,
  Send,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tenant/support")({
  component: TenantSupportPage,
  head: () => ({
    meta: [{ title: "Support & Help Desk — Master HRMS" }],
  }),
});

function TenantSupportPage() {
  const [form, setForm] = useState({
    subject: "",
    message: "",
    priority: "normal",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Support ticket #TK-8492 created. Our enterprise team will respond shortly.");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <HelpCircle className="h-6 w-6 text-primary" />
          Enterprise Support & SLA Help Desk
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Direct priority escalation channel to platform engineering and dedicated success managers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="md:col-span-2 border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Open Priority Support Ticket</CardTitle>
            <CardDescription className="text-xs">
              Guaranteed 1-hour response SLA for sovereign enterprise workspaces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-foreground">Ticket Successfully Logged</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Ticket reference #TK-8492 has been dispatched to tier-3 platform engineers. Confirmation sent to your registered email.
                </p>
                <Button size="sm" variant="outline" onClick={() => setSubmitted(false)}>
                  Submit Another Ticket
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Issue Subject</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Brief description of the request or bug..."
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Detailed Description</Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Provide reproduction steps, affected employee IDs, or requirements..."
                    rows={5}
                    required
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="gap-2">
                    <Send className="h-4 w-4" /> Dispatch Ticket
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                Browse our comprehensive developer and administrator deployment guides.
              </p>
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-medium hover:underline inline-flex items-center gap-1 pt-1"
              >
                Open Documentation Portal <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Direct Emergency Line
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              <div className="text-muted-foreground">Email:</div>
              <div className="font-mono font-medium text-foreground">emergency-support@masterhrms.com</div>
              <div className="text-muted-foreground pt-1.5">Emergency Phone:</div>
              <div className="font-mono font-medium text-foreground">+1 (800) 555-HRMS</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
