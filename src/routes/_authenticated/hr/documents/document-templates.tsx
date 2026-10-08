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
import { FileCode, Plus, Code } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/documents/document-templates")({
  component: HrDocumentTemplatesPage,
});

export default function HrDocumentTemplatesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    category: "General",
    type: "letter",
    content: `Dear {{employeeName}} (Code: {{employeeCode}}),\n\nWe are pleased to issue this official document regarding your role as {{designation}} in {{department}}.\n\nDate of Joining: {{joiningDate}}\nCompany: {{companyName}}\n\nSincerely,\nHR Department`,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["hr-document-templates"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/templates");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/documents/templates", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Document template saved");
      queryClient.invalidateQueries({ queryKey: ["hr-document-templates"] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create template");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Document & Letter Templates"
        description="Reusable templates with dynamic placeholder token merge (e.g. {{employeeName}}, {{designation}})."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Template
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCode className="h-5 w-5 text-indigo-500" />
            Configured Templates ({templates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Title</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tokens Supported</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading templates...
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No templates created. Click "Create Template" to configure one.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="font-mono text-xs">{t.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.type}</Badge>
                    </TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Code className="h-3.5 w-3.5" />
                        {Array.isArray(t.tokens) ? t.tokens.length : 8} tokens
                      </span>
                    </TableCell>
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
            <DialogTitle>Create Document Template</DialogTitle>
            <DialogDescription>
              Use tokens like <code>&#123;&#123;employeeName&#125;&#125;</code> and <code>&#123;&#123;designation&#125;&#125;</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Title</Label>
              <Input
                placeholder="e.g. Standard Appointment Letter"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Code</Label>
                <Input
                  placeholder="e.g. APPT_LTR_V1"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Template Body / HTML</Label>
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
              {createMutation.isPending ? "Saving..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
