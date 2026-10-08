import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, MessageSquare, Calendar, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/lifecycle/warnings")({
  component: MeWarningsPage,
});

export default function MeWarningsPage() {
  const queryClient = useQueryClient();
  const [selectedWarning, setSelectedWarning] = useState<any>(null);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [responseText, setResponseText] = useState("");

  const { data: warnings = [], isLoading } = useQuery({
    queryKey: ["me-lifecycle-warnings"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/warnings");
      return res.data;
    },
  });

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.put(`/me/lifecycle/warnings/${id}/acknowledge`);
    },
    onSuccess: () => {
      toast.success("Notice acknowledged. Timestamp recorded.");
      queryClient.invalidateQueries({ queryKey: ["me-lifecycle-warnings"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to acknowledge warning");
    },
  });

  const responseMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      return await api.put(`/me/lifecycle/warnings/${id}/response`, { response });
    },
    onSuccess: () => {
      toast.success("Your written explanation was submitted to HR");
      queryClient.invalidateQueries({ queryKey: ["me-lifecycle-warnings"] });
      setIsResponseOpen(false);
      setSelectedWarning(null);
      setResponseText("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit response");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disciplinary Notices & Advisory Warnings"
        description="Review formal advisories, record digital acknowledgements, and submit written representations."
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading notices...</div>
      ) : warnings.length === 0 ? (
        <Card className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-semibold">Clean Disciplinary Record</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You have no active or historical disciplinary warnings on record.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {warnings.map((w: any) => (
            <Card key={w.id} className="border-rose-200/50">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{w.subject}</span>
                        <Badge variant="destructive" className="text-xs uppercase">
                          {w.severity || "Standard"} Warning
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Issued:{" "}
                          {new Date(w.warningDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!w.acknowledgedAt ? (
                      <Button
                        size="sm"
                        variant="default"
                        disabled={ackMutation.isPending}
                        onClick={() => ackMutation.mutate(w.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Acknowledge
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Acknowledged on {new Date(w.acknowledgedAt).toLocaleDateString()}
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedWarning(w);
                        setResponseText(w.employeeResponse || "");
                        setIsResponseOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {w.employeeResponse ? "Update Response" : "Submit Explanation"}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border space-y-3">
                  <p className="text-sm text-foreground/90">{w.description}</p>

                  {w.employeeResponse && (
                    <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                      <span className="font-semibold text-muted-foreground">Your Written Explanation:</span>
                      <p className="text-foreground">{w.employeeResponse}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* RESPONSE MODAL */}
      <Dialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Written Explanation</DialogTitle>
            <DialogDescription>
              Provide your perspective or context regarding notice "{selectedWarning?.subject}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Your Statement / Explanation</Label>
              <Textarea
                rows={5}
                placeholder="Detail mitigating circumstances or clarification..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResponseOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={responseMutation.isPending || !responseText}
              onClick={() => {
                if (selectedWarning) {
                  responseMutation.mutate({
                    id: selectedWarning.id,
                    response: responseText,
                  });
                }
              }}
            >
              {responseMutation.isPending ? "Submitting..." : "Submit to HR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
