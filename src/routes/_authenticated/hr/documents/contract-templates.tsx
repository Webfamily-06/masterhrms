import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileSignature, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/documents/contract-templates")({
  component: HrContractTemplatesPage,
});

export default function HrContractTemplatesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    category: "Contract",
    type: "contract",
    content: `EMPLOYMENT AGREEMENT\n\nThis agreement is made between {{companyName}} and {{employeeName}} (ID: {{employeeCode}}).\n\n1. Role & Department: {{designation}} in {{department}}\n2. Effective Date: {{joiningDate}}\n3. Remuneration: {{salary}}\n\nSigned by authorized company representative.`,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["hr-contract-templates"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/templates?type=contract");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/documents/templates", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Contract template created");
      queryClient.invalidateQueries({ queryKey: ["hr-contract-templates"] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create template");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Contract Templates"
        description="Standardized legal contracts, NDAs, non-compete agreements, and executive retainers."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Contract Template
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-indigo-500" />
            Contract Templates Library ({templates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Title</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading templates...
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No contract templates found. Click "Add Contract Template" to configure.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="font-mono text-xs">{t.code}</TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>
                      <Badge variant={t.isActive ? "default" : "secondary"}>
                        {t.isActive ? "Active" : "Draft"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Contract Template</DialogTitle>
            <DialogDescription>Define contract clauses with dynamic employee tokens.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Contract Title</Label>
              <Input
                placeholder="e.g. Standard Full-Time Employment Agreement"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Template Code</Label>
              <Input
                placeholder="e.g. CTR_FT_2026"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contract Clauses / Terms</Label>
              <Textarea
                rows={7}
                className="font-mono text-xs"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.title || !formData.code || createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
