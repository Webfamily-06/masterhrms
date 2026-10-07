import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Plus, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/offer-templates")({
  component: OfferTemplatesPage,
});

export default function OfferTemplatesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "Standard Full-Time Offer Letter",
    code: "OFF-STD",
    bodyHtml: "<p>Dear {{candidateName}},</p><p>We are delighted to extend an offer for {{designation}} at {{companyName}} with an annual compensation of ₹{{annualCtc}}.</p>",
    termsAndConditions: "Standard 30 days notice period, 6 months probation.",
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["hr-offer-templates"],
    queryFn: async () => {
      const res = await api.get<any[]>("/hr/recruitment/offer-templates");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/offer-templates", payload);
    },
    onSuccess: () => {
      toast.success("Offer template created");
      queryClient.invalidateQueries({ queryKey: ["hr-offer-templates"] });
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create offer template"),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Offer Letter Templates"
          description="Standardized legal contracts, compensation schedules, and onboarding clauses with variable placeholders."
        />
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Add Template
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Offer Templates"
          value={templates.length.toString()}
          description="Document contract packs"
          icon={<FileText className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Merge Tokens"
          value="Enabled"
          description="{{candidateName}}, {{annualCtc}}..."
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates Directory</CardTitle>
          <CardDescription>Formatted templates for generating candidate appointment contracts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Terms & Clauses</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No offer templates configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((tpl: any) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-semibold">{tpl.name}</TableCell>
                    <TableCell className="font-mono text-xs">{tpl.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tpl.termsAndConditions || "Standard terms apply"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Offer Letter Template</DialogTitle>
            <DialogDescription>
              Use placeholders like &#123;&#123;candidateName&#125;&#125;, &#123;&#123;annualCtc&#125;&#125;, &#123;&#123;designation&#125;&#125;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Template Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Body Content / HTML *</Label>
              <Textarea
                rows={4}
                value={formData.bodyHtml}
                onChange={(e) => setFormData({ ...formData, bodyHtml: e.target.value })}
              />
            </div>
            <div>
              <Label>Terms & Conditions</Label>
              <Textarea
                rows={2}
                value={formData.termsAndConditions}
                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.name.trim() || !formData.bodyHtml.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
