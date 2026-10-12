import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  ShieldCheck,
  Key,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Settings,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/sms-gateway")({
  component: SmsGatewayPage,
  head: () => ({
    meta: [{ title: "Enterprise SMS Gateway & DLT Setup — Master ERP" }],
  }),
});

interface SmsGatewayConfig {
  provider: "msg91" | "fast2sms";
  apiKeyMasked?: string;
  senderId?: string;
  templateId?: string;
  route?: string;
  dltEntityId?: string;
}

export function SmsGatewayPage() {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<"msg91" | "fast2sms">("msg91");
  const [showTestModal, setShowTestModal] = useState(false);

  // Form State
  const [authKey, setAuthKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [routeType, setRouteType] = useState("dlt");
  const [dltEntityId, setDltEntityId] = useState("");

  // Test Modal State
  const [testRecipient, setTestRecipient] = useState("+919876543210");
  const [testMessage, setTestMessage] = useState("Your Master ERP verification code is 482910. Valid for 5 minutes.");

  // 1. Fetch current config
  const { data: config, isLoading, refetch } = useQuery<SmsGatewayConfig>({
    queryKey: ["tenant-sms-gateway-config"],
    queryFn: async () => {
      try {
        const res = await api.get<{ config: SmsGatewayConfig }>("/sms-gateway/config");
        return res?.config || { provider: "msg91" };
      } catch {
        return { provider: "msg91" };
      }
    },
    staleTime: 5000,
  });

  useEffect(() => {
    if (config) {
      if (config.provider) setProvider(config.provider);
      if (config.senderId) setSenderId(config.senderId);
      if (config.templateId) setTemplateId(config.templateId);
      if (config.route) setRouteType(config.route);
      if (config.dltEntityId) setDltEntityId(config.dltEntityId);
    }
  }, [config]);

  // 2. Save config mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return await api.put("/sms-gateway/config", {
        provider,
        authKey: authKey.trim() || undefined,
        senderId: senderId.trim(),
        templateId: templateId.trim(),
        route: routeType.trim(),
        dltEntityId: dltEntityId.trim(),
      });
    },
    onSuccess: () => {
      toast.success("SMS Gateway configuration saved successfully!");
      setAuthKey("");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update SMS gateway configuration.");
    },
  });

  // 3. Test send mutation
  const testSendMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ success: boolean; messageId: string }>("/sms-gateway/test-send", {
        recipient: testRecipient.trim(),
        message: testMessage.trim(),
      });
    },
    onSuccess: (data) => {
      toast.success(`Test SMS dispatched to sandbox! Message ID: ${data?.messageId || "simulated"}`);
      setShowTestModal(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to dispatch test SMS.");
    },
  });

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">SMS Gateway Configuration</h1>
            <Badge variant="outline" className="text-xs font-mono">
              E7 Messaging Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure enterprise telecom adapters (MSG91, Fast2SMS) for automated OTP verification and attendance notices.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-bold gap-1.5"
            onClick={() => setShowTestModal(true)}
          >
            <Send className="size-3.5 text-primary" /> Test SMS Delivery
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-16 text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-2">Loading SMS configuration...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Main Form (8 cols on XL, full on smaller) */}
          <Card className="xl:col-span-8 border shadow-xs">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Settings className="size-4 text-primary" /> Telecom Provider Settings
                </CardTitle>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                  WRITE-ONLY SECRET MASKING ACTIVE
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Credentials are AES-encrypted at rest and masked as dots on all read queries.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6 text-xs">
              {/* Provider Switcher */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Telecom Provider</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                  <Button
                    type="button"
                    variant={provider === "msg91" ? "default" : "outline"}
                    onClick={() => setProvider("msg91")}
                    className="font-bold text-xs h-10 gap-2 justify-start sm:justify-center"
                  >
                    <MessageSquare className="size-4 shrink-0" /> MSG91 (DLT Flow)
                  </Button>
                  <Button
                    type="button"
                    variant={provider === "fast2sms" ? "default" : "outline"}
                    onClick={() => setProvider("fast2sms")}
                    className="font-bold text-xs h-10 gap-2 justify-start sm:justify-center"
                  >
                    <Smartphone className="size-4 shrink-0" /> Fast2SMS (DLT / Quick)
                  </Button>
                </div>
              </div>

              {/* Form fields in two balanced columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">API Key / Auth Key</Label>
                  <Input
                    type="password"
                    placeholder={config?.apiKeyMasked || "Enter new provider API key..."}
                    value={authKey}
                    onChange={(e) => setAuthKey(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Leave blank to retain current encrypted key.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Approved DLT Sender ID (6 Characters)</Label>
                  <Input
                    placeholder="MSTHRM"
                    maxLength={6}
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value.toUpperCase())}
                    className="text-xs h-9 font-mono font-bold tracking-wider uppercase"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Header approved on telecom operator portal (e.g. Jio, Airtel).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Template / Flow ID</Label>
                  <Input
                    placeholder="61e9b21a0f9b1..."
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    DLT registered Content Template ID for OTP/Transactional dispatch.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">DLT Entity / Principal Entity ID (India)</Label>
                  <Input
                    placeholder="120116000000001"
                    value={dltEntityId}
                    onChange={(e) => setDltEntityId(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Registered Enterprise / Entity ID on TRAI DLT network.
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-4 border-t flex justify-end">
              <Button
                size="sm"
                className="font-bold"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving..." : "Save Gateway Configuration"}
              </Button>
            </CardFooter>
          </Card>

          {/* Right Column: Regulatory & Sandbox Status Guide (4 cols on XL) */}
          <div className="xl:col-span-4 space-y-6">
            <Card className="border shadow-xs">
              <CardHeader className="pb-3 border-b bg-muted/10">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <ShieldCheck className="size-4 text-emerald-600" /> Telecom Compliance (DLT)
                </CardTitle>
                <CardDescription className="text-xs">
                  Indian Telecom Regulatory Authority (TRAI) mandate.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs text-muted-foreground">
                <div className="space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="size-3.5 text-primary" /> 6-Character Sender ID (Header)
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Must represent your registered enterprise brand name or abbreviation exactly as approved.
                  </p>
                </div>

                <div className="space-y-1 border-t pt-2.5">
                  <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="size-3.5 text-primary" /> Principal Entity ID (PE ID)
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    14 to 19 digit numerical identifier provided during business KYC on operator portals (Vilpower, Airtel, BSNL).
                  </p>
                </div>

                <div className="space-y-1 border-t pt-2.5">
                  <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="size-3.5 text-primary" /> Content Template Binding
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Every outgoing message must strictly match an approved registered template with registered variables.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-muted/5">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Layers className="size-4 text-primary" /> Gateway Operational State
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Adapter:</span>
                  <Badge variant="outline" className="font-mono text-[11px] font-bold">
                    {provider.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Secret Storage:</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                    AES-256-GCM
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Localhost Mode:</span>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    Sandbox Mock Double
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTestModal(true)}
                  className="w-full text-xs font-bold gap-1.5 mt-2"
                >
                  <Send className="size-3.5 text-primary" /> Test Dispatch Simulation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL: TEST SMS DISPATCH */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Send className="size-4 text-primary" /> Test SMS Delivery (Sandbox Safe)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Simulates carrier dispatch to verify credential validation and payload formatting without live telecom billing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Recipient Mobile Number</Label>
              <Input
                placeholder="+919876543210"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Test Message Body</Label>
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setShowTestModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!testRecipient.trim() || testSendMutation.isPending}
              onClick={() => testSendMutation.mutate()}
              className="font-bold"
            >
              {testSendMutation.isPending ? "Sending..." : "Dispatch Test SMS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SmsGatewayPage;
