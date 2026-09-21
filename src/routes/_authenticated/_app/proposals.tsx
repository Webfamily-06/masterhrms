import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Plus,
  Send,
  Loader2,
  Trash2,
  Receipt,
  ExternalLink,
  Copy,
  Check,
  Globe,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/proposals")({
  component: ProposalsPage,
  head: () => ({ meta: [{ title: "Proposals & Quotes — Master ERP" }] }),
});

export type ProposalRecord = {
  id: string;
  proposalNo?: string;
  title: string;
  client: string;
  clientName?: string;
  clientEmail?: string;
  clientGstin?: string;
  amount: number;
  date: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "converted";
  created_at: string;
  terms?: string;
  notes?: string;
};

const DEFAULT_SEED_PROPOSALS: ProposalRecord[] = [];

function ProposalsPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;

  const [propTitle, setPropTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [termsInput, setTermsInput] = useState("Standard 30 days quotation validity. Net 15 days payment.");
  const [isSaving, setIsSaving] = useState(false);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  // 1. Fetch Realtime Proposals from MySQL API
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["realtime-tenant-proposals", tenantId],
    queryFn: async () => {
      try {
        const list = await api.get("/crm/proposals");
        if (Array.isArray(list)) return list as ProposalRecord[];
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Create Proposal Handler
  async function handleCreateProposal() {
    if (!propTitle.trim() || !clientName.trim() || !amountInput.trim()) {
      return toast.error("Please fill in all proposal fields");
    }
    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) return toast.error("Invalid amount");

    setIsSaving(true);
    try {
      await api.post("/crm/proposals", {
        title: propTitle.trim(),
        client: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        amount: amt,
        date: new Date().toISOString().slice(0, 10),
        status: "sent",
        terms: termsInput.trim(),
      });
      toast.success(`Proposal "${propTitle}" created & sent!`);
      setPropTitle("");
      setClientName("");
      setClientEmail("");
      setAmountInput("");
      qc.invalidateQueries({ queryKey: ["realtime-tenant-proposals", tenantId] });
    } catch (e: any) {
      toast.error(e.message || "Failed to create proposal");
    } finally {
      setIsSaving(false);
    }
  }

  // 4. Delete Proposal Handler
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this proposal?")) return;
    try {
      await api.delete(`/crm/proposals/${id}`);
      toast.success("Proposal deleted");
      qc.invalidateQueries({ queryKey: ["realtime-tenant-proposals", tenantId] });
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  }

  async function updateStatus(id: string, newStatus: ProposalRecord["status"]) {
    try {
      await api.patch(`/crm/proposals/${id}`, { status: newStatus });
      toast.success(`Proposal status updated to ${newStatus.toUpperCase()}!`);
      qc.invalidateQueries({ queryKey: ["realtime-tenant-proposals", tenantId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  }

  async function deleteProposal(id: string) {
    await handleDelete(id);
  }

  function copyPublicLink(id: string) {
    const link = `${window.location.origin}/portal/proposals/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Public Quotation link copied to clipboard!");
  }

  async function handleConvertToInvoice(p: ProposalRecord) {
    try {
      const res = await api.post(`/crm/proposals/${p.id}/convert`);
      toast.success(res?.message || `Proposal ${p.id} successfully converted to invoice!`);
      qc.invalidateQueries({ queryKey: ["realtime-tenant-proposals", tenantId] });
      qc.invalidateQueries({ queryKey: ["pos-sales", tenantId] });
    } catch (err: any) {
      // Fallback to standard invoice creation if needed
      try {
        const invPayload = {
          number: `INV-${Date.now().toString().slice(-6)}`,
          client: p.client,
          date: new Date().toISOString().slice(0, 10),
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
          amount: p.amount,
          status: "unpaid",
          lines: [
            {
              description: p.title,
              qty: 1,
              rate: p.amount,
              amount: p.amount,
            },
          ],
        };
        await api.post("/invoices", invPayload);
        toast.success(`Proposal converted to Invoice ${invPayload.number}!`);
        qc.invalidateQueries({ queryKey: ["realtime-tenant-proposals", tenantId] });
      } catch (inner: any) {
        toast.error(inner.message || "Failed to convert proposal to invoice");
      }
    }
  }

  return (
    <PlanGuard moduleName="Proposals & Quotations" requiredPlan="starter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FileText className="size-6 text-primary" /> Realtime Proposals & Quotations
            </h1>
            <p className="text-xs text-muted-foreground">
              Digital client proposals & quotes synced in real-time to MySQL database.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={proposals.length} limit={50} label="Proposals Quota" />
          </div>
        </div>

        {/* Create & List Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Create Form */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">Create Proposal / Quote</CardTitle>
              <CardDescription className="text-xs">
                Generate instant quotation document.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Proposal Title *</label>
                <Input
                  placeholder="e.g. ERP Cloud Implementation"
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Client / Company Name *</label>
                <Input
                  placeholder="Apex Global Ltd"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Client Email (For Digital Delivery)</label>
                <Input
                  type="email"
                  placeholder="finance@apexglobal.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">
                  Quoted Amount ({sysConfig?.currencySymbol || "₹"}) *
                </label>
                <Input
                  type="number"
                  placeholder="250000"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Terms & Conditions</label>
                <Input
                  placeholder="Standard 30 days validity"
                  value={termsInput}
                  onChange={(e) => setTermsInput(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <Button
                size="lg"
                onClick={handleCreateProposal}
                disabled={isSaving}
                className="w-full font-bold gap-2"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}{" "}
                Save & Dispatch Proposal
              </Button>
            </CardContent>
          </Card>

          {/* Proposals List */}
          <Card className="lg:col-span-8">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">
                  Live Proposal Database ({proposals.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Persistent quotation records synced live.
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-xs text-emerald-600 bg-emerald-500/10"
              >
                ● Live Database
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 grid place-items-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : proposals.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground italic space-y-1">
                  <FileText className="size-8 mx-auto opacity-30" />
                  <p>No proposals created yet. Create one using the form on the left.</p>
                </div>
              ) : (
                <div className="divide-y text-xs">
                  {proposals.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors"
                    >
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">
                            {p.proposalNo || p.id}
                          </span>
                          <Badge variant="outline" className="text-[9px]">
                            {p.date}
                          </Badge>
                        </div>
                        <p className="font-bold text-foreground text-sm">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Client: {p.clientName || p.client}{" "}
                          {p.clientEmail ? `(${p.clientEmail})` : ""}
                        </p>
                      </div>

                      <div className="text-right space-y-1.5 shrink-0">
                        <p className="font-mono font-black text-sm text-emerald-600">
                          {formatSystemAmount(p.amount, sysConfig)}
                        </p>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Badge
                            className={`text-[9px] font-mono capitalize ${
                              p.status === "accepted"
                                ? "bg-emerald-500 text-white"
                                : p.status === "sent"
                                  ? "bg-blue-500 text-white"
                                  : p.status === "converted"
                                    ? "bg-purple-500 text-white"
                                    : p.status === "rejected"
                                      ? "bg-rose-500 text-white"
                                      : "bg-secondary text-foreground"
                            }`}
                          >
                            {p.status}
                          </Badge>

                          {/* Copy Public Portal Link */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 text-muted-foreground hover:text-primary"
                            title="Copy Public Customer Portal Link"
                            onClick={() => copyPublicLink(p.id)}
                          >
                            <Copy className="size-3" />
                          </Button>

                          {/* Open Public Portal in New Tab */}
                          <a
                            href={`/portal/proposals/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="size-6 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                            title="Preview Public Customer Quotation"
                          >
                            <ExternalLink className="size-3" />
                          </a>

                          {p.status === "draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] gap-1 px-2 font-semibold"
                              onClick={() => updateStatus(p.id, "sent")}
                            >
                              <Send className="size-3" /> Send
                            </Button>
                          )}
                          {p.status === "sent" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] gap-1 px-2 font-semibold text-emerald-600 hover:bg-emerald-500 hover:text-white"
                              onClick={() => updateStatus(p.id, "accepted")}
                            >
                              Accept
                            </Button>
                          )}
                          {p.status === "accepted" && (
                            <Button
                              size="sm"
                              className="h-6 text-[10px] gap-1 px-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              onClick={() => handleConvertToInvoice(p)}
                            >
                              <Receipt className="size-3" /> Convert to Invoice
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 text-destructive"
                            onClick={() => deleteProposal(p.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PlanGuard>
  );
}
