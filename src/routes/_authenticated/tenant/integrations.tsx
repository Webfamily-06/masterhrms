import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Cpu, Mail, Key, Webhook, CheckCircle2, Copy, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tenant/integrations")({
  component: TenantIntegrationsPage,
  head: () => ({
    meta: [{ title: "Integrations & API Keys — Master HRMS" }],
  }),
});

function TenantIntegrationsPage() {
  const [apiKey, setApiKey] = useState("mstr_live_948f21bb8d462574f4364");
  const [smtp, setSmtp] = useState({
    host: "smtp.sendgrid.net",
    port: "587",
    user: "apikey",
    sender: "notifications@masterhrms.com",
    enabled: true,
  });

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success("API Key copied to clipboard!");
  };

  const handleSave = () => {
    toast.success("Integration settings saved.");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Cpu className="h-6 w-6 text-primary" />
          Integrations, SMTP & API Keys
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure third-party transactional mail servers, webhooks, and REST API access tokens.
        </p>
      </div>

      {/* SMTP Email Server */}
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base font-semibold">Custom SMTP Server</CardTitle>
                <CardDescription className="text-xs">
                  Deliver employee invitations, payslip PDFs, and password resets via your own email domain.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={smtp.enabled}
              onCheckedChange={(val) => setSmtp({ ...smtp, enabled: val })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">SMTP Server Host</Label>
              <Input
                value={smtp.host}
                onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                placeholder="smtp.mailgun.org"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">SMTP Port</Label>
              <Input
                value={smtp.port}
                onChange={(e) => setSmtp({ ...smtp, port: e.target.value })}
                placeholder="587"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Username / API Key</Label>
              <Input
                value={smtp.user}
                onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                placeholder="user@domain.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sender Email Address</Label>
              <Input
                value={smtp.sender}
                onChange={(e) => setSmtp({ ...smtp, sender: e.target.value })}
                placeholder="hr@yourcompany.com"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" /> Save SMTP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* REST API Access */}
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base font-semibold">REST API Key</CardTitle>
              <CardDescription className="text-xs">
                Authorize external HRMS webhooks, Zapier integrations, and biometric clock-in devices.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={apiKey} readOnly className="font-mono text-xs bg-muted/40" />
            <Button variant="outline" size="sm" onClick={copyKey} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Include as <code className="bg-muted px-1 py-0.5 rounded">Authorization: Bearer {'<API_KEY>'}</code> in your HTTP requests.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
