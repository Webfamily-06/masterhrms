'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cpu, Mail, Key, Webhook, CheckCircle2, Copy, Save, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { IntegrationsHubStudio } from '@/components/integrations/integrations-hub-studio';

function TenantIntegrationsPage() {
  const [apiKey, setApiKey] = useState('mstr_live_948f21bb8d462574f4364');
  const [smtp, setSmtp] = useState({
    host: 'smtp.sendgrid.net',
    port: '587',
    user: 'apikey',
    sender: 'notifications@masterhrms.com',
    enabled: true,
  });

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API Key copied to clipboard!');
  };

  const handleSave = () => {
    toast.success('Integration settings saved.');
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <Tabs defaultValue="apps" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Cpu className="h-6 w-6 text-primary" />
              Integrations, Apps & API Gateways
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect external SaaS services, transactional email servers, and custom REST API keys.
            </p>
          </div>

          <TabsList className="h-9">
            <TabsTrigger value="apps" className="text-xs gap-1.5">
              <Zap className="size-3.5" /> App Integrations
            </TabsTrigger>
            <TabsTrigger value="smtp" className="text-xs gap-1.5">
              <Mail className="size-3.5" /> Custom SMTP
            </TabsTrigger>
            <TabsTrigger value="api" className="text-xs gap-1.5">
              <Key className="size-3.5" /> REST API Key
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Reference B & C App Cards & Modal */}
        <TabsContent value="apps" className="space-y-6">
          <IntegrationsHubStudio />
        </TabsContent>

        {/* Tab 2: Custom SMTP */}
        <TabsContent value="smtp" className="max-w-4xl space-y-4">
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
        </TabsContent>

        {/* Tab 3: REST API Key */}
        <TabsContent value="api" className="max-w-4xl space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TenantIntegrationsPage;
