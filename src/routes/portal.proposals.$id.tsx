import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Check,
  Send,
  AlertCircle,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/portal/proposals/$id")({
  component: ClientProposalPortalPage,
  head: () => ({
    meta: [
      { title: "Client Quotation & Proposal Portal — Master ERP" },
      { name: "description", content: "Review and digitally accept your official quotation." },
    ],
  }),
});

export default function ClientProposalPortalPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [declineNotes, setDeclineNotes] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-proposal", id],
    queryFn: async () => {
      const res = await api.get(`/crm/proposals/public/${id}`);
      return res?.proposal || null;
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (payload: { action: "accept" | "decline"; signatureName?: string; notes?: string }) => {
      return await api.post(`/crm/proposals/public/${id}/respond`, payload);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Response submitted successfully!");
      setIsAcceptOpen(false);
      setIsDeclineOpen(false);
      qc.invalidateQueries({ queryKey: ["public-proposal", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit response");
    },
  });

  const proposal = data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Loading quotation proposal...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-6 text-center">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive grid place-items-center mb-3">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-lg font-bold">Proposal Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          This quotation link may have expired or is invalid. Please contact the issuer for an updated link.
        </p>
        <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => window.history.back()}>
          <ArrowLeft className="size-3.5 mr-1" /> Return
        </Button>
      </div>
    );
  }

  const isAccepted = proposal.status === "accepted";
  const isConverted = proposal.status === "converted";
  const isDeclined = proposal.status === "rejected";
  const isPending = proposal.status === "sent" || proposal.status === "draft";

  const items = Array.isArray(proposal.items) && proposal.items.length > 0
    ? proposal.items
    : [
        {
          description: proposal.title,
          qty: 1,
          rate: proposal.amount,
          amount: proposal.amount,
        },
      ];

  return (
    <div className="min-h-screen bg-muted/20 pb-16 pt-8 px-4 sm:px-6 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Actions Bar (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold gap-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <span className="text-xs text-muted-foreground">Client Self-Service Portal</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" /> Print / Save PDF
            </Button>

            {isPending && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1"
                  onClick={() => setIsDeclineOpen(true)}
                >
                  <XCircle className="size-3.5" /> Decline
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
                  onClick={() => {
                    setSignerName(proposal.clientName);
                    setIsAcceptOpen(true);
                  }}
                >
                  <Check className="size-3.5" /> Accept Proposal
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status Notification Banner */}
        {isAccepted && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 print:hidden">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <div className="text-xs">
              <p className="font-bold">Quotation Digitally Accepted</p>
              <p className="text-muted-foreground">
                Thank you! This proposal has been formally confirmed. Our team has scheduled execution.
              </p>
            </div>
          </div>
        )}

        {isConverted && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 flex items-center gap-3 text-blue-800 dark:text-blue-300 print:hidden">
            <CheckCircle2 className="size-5 shrink-0 text-blue-600" />
            <div className="text-xs">
              <p className="font-bold">Converted to Invoice</p>
              <p className="text-muted-foreground">
                This quotation has been approved and billed. Please review linked statements in your portal.
              </p>
            </div>
          </div>
        )}

        {isDeclined && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-rose-800 dark:text-rose-300 print:hidden">
            <XCircle className="size-5 shrink-0 text-rose-600" />
            <div className="text-xs">
              <p className="font-bold">Quotation Declined</p>
              <p className="text-muted-foreground">
                This proposal has been archived. If you'd like a revised quote, please reach out.
              </p>
            </div>
          </div>
        )}

        {/* Formal Proposal Document Canvas */}
        <Card className="border shadow-md bg-card print:border-none print:shadow-none">
          <CardContent className="p-8 sm:p-12 space-y-8">
            {/* Header / Brand */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b pb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center font-black">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight">
                      {proposal.organization?.name || "Corporate Enterprise"}
                    </h1>
                    <p className="text-[11px] text-muted-foreground">Commercial Proposal & Formal Quotation</p>
                  </div>
                </div>
              </div>

              <div className="text-right space-y-1">
                <Badge
                  variant="outline"
                  className={`capitalize font-mono text-xs px-2.5 py-0.5 ${
                    isAccepted
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold"
                      : isConverted
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-600 font-bold"
                        : isDeclined
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-600 font-semibold"
                  }`}
                >
                  ● {proposal.status}
                </Badge>
                <p className="font-mono text-xs text-muted-foreground">
                  Ref: <span className="font-bold text-foreground">{proposal.proposalNo}</span>
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                  <Calendar className="size-3" /> Date: {new Date(proposal.createdAt).toLocaleDateString()}
                </p>
                {proposal.validUntil && (
                  <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                    <Clock className="size-3" /> Valid Until: {new Date(proposal.validUntil).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Recipient & Project Overview */}
            <div className="grid sm:grid-cols-2 gap-6 bg-muted/30 p-5 rounded-lg border text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Prepared For:
                </span>
                <p className="font-bold text-sm text-foreground">{proposal.clientName}</p>
                {proposal.clientEmail && (
                  <p className="text-muted-foreground">{proposal.clientEmail}</p>
                )}
                {proposal.clientGstin && (
                  <p className="font-mono text-muted-foreground">GSTIN: {proposal.clientGstin}</p>
                )}
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Proposal Scope:
                </span>
                <p className="font-bold text-sm text-foreground">{proposal.title}</p>
                <p className="text-muted-foreground">Digital SaaS & Enterprise Services</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pricing & Deliverables Schedule
              </h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b text-[11px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Item Description</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Unit Rate</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="p-3 font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="p-3 font-medium text-foreground">
                          {it.description || it.name || proposal.title}
                        </td>
                        <td className="p-3 text-right font-mono">{it.qty || it.quantity || 1}</td>
                        <td className="p-3 text-right font-mono">
                          {formatSystemAmount(Number(it.rate || it.unitPrice || proposal.amount))}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          {formatSystemAmount(Number(it.amount || it.total || proposal.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-bold">{formatSystemAmount(proposal.amount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Taxes & Levies</span>
                  <span className="font-mono text-muted-foreground">Included / As Applicable</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="font-black text-foreground">Grand Total Value</span>
                  <span className="font-mono font-black text-primary text-base">
                    {formatSystemAmount(proposal.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms & Notes */}
            <div className="space-y-4 pt-6 border-t text-xs">
              {proposal.terms && (
                <div className="space-y-1">
                  <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Commercial Terms & Validity
                  </h4>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-3 rounded-md">
                    {proposal.terms}
                  </p>
                </div>
              )}

              {proposal.notes && (
                <div className="space-y-1">
                  <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Notes & Digital Audit Trail
                  </h4>
                  <p className="text-muted-foreground whitespace-pre-line bg-muted/20 p-3 rounded-md font-mono text-[11px]">
                    {proposal.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Signatures & Execution Footnote */}
            <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Verified Official Quotation • Master ERP Enterprise Portal</span>
              </div>
              <p className="text-[11px] font-mono">Doc ID: {proposal.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accept Proposal Dialog */}
      <Dialog open={isAcceptOpen} onOpenChange={setIsAcceptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" /> Accept Quotation Proposal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm acceptance of Quotation #{proposal.proposalNo} for {formatSystemAmount(proposal.amount)}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold">Authorized Signatory Full Name *</label>
              <Input
                placeholder="e.g. John Doe (Director / Finance Lead)"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                By clicking Confirm, you digitally acknowledge and accept the deliverables schedule and pricing terms.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAcceptOpen(false)}
              disabled={respondMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              disabled={!signerName.trim() || respondMutation.isPending}
              onClick={() =>
                respondMutation.mutate({
                  action: "accept",
                  signatureName: signerName.trim(),
                })
              }
            >
              {respondMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Check className="size-3.5 mr-1" />
              )}
              Confirm & Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Proposal Dialog */}
      <Dialog open={isDeclineOpen} onOpenChange={setIsDeclineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-destructive">
              <XCircle className="size-5" /> Decline Proposal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please share any feedback or requirements adjustments for our team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold">Feedback / Reason (Optional)</label>
              <Textarea
                rows={3}
                placeholder="e.g. Scope adjustment requested, timeline does not align, budget revision required..."
                value={declineNotes}
                onChange={(e) => setDeclineNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeclineOpen(false)}
              disabled={respondMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={respondMutation.isPending}
              onClick={() =>
                respondMutation.mutate({
                  action: "decline",
                  notes: declineNotes.trim(),
                })
              }
            >
              {respondMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <XCircle className="size-3.5 mr-1" />
              )}
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
