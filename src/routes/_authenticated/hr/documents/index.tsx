import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plus, Download, FileCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/documents/")({
  component: HrDocumentsVaultPage,
});

export default function HrDocumentsVaultPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "Company Policy",
    fileName: "policy.pdf",
    fileUrl: "/mock/docs/company-policy.pdf",
    fileSize: "1.4 MB",
    requiresSignature: false,
    notes: "",
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["hr-company-documents"],
    queryFn: async () => {
      const res = await api.get("/hr/documents");
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["hr-categories-picker"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/categories");
      return res.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/documents", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Document added to corporate vault");
      queryClient.invalidateQueries({ queryKey: ["hr-company-documents"] });
      setIsModalOpen(false);
      setFormData({
        title: "",
        category: "Company Policy",
        fileName: "policy.pdf",
        fileUrl: "/mock/docs/company-policy.pdf",
        fileSize: "1.4 MB",
        requiresSignature: false,
        notes: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to add document");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Corporate Document Vault"
        description="Secure enterprise repository for handbooks, policies, NDAs, and statutory guidelines."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Upload Document
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            Repository Vault ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Title & Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>File Details</TableHead>
                <TableHead>Target Scope</TableHead>
                <TableHead>Sign-offs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading corporate documents...
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No documents found in vault. Click "Upload Document" to store company files.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <div>{d.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{d.documentCode}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{d.fileName}</div>
                      <div>{d.fileSize}</div>
                    </TableCell>
                    <TableCell>
                      {d.employee ? (
                        <span className="text-sm font-medium">
                          {d.employee.firstName} {d.employee.lastName}
                        </span>
                      ) : (
                        <Badge variant="secondary">Company-Wide</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        {d._count?.acknowledgements || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.status === "verified" ? "default" : "secondary"}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {d.fileUrl && (
                        <a href={d.fileUrl} target="_blank" rel="noreferrer" download>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Download className="h-3.5 w-3.5" /> View
                          </Button>
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Document to Vault</DialogTitle>
            <DialogDescription>Store a corporate guideline, policy, or contract.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Title</Label>
              <Input
                placeholder="e.g. Employee Code of Conduct 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length > 0 ? (
                      categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Company Policy">Company Policy</SelectItem>
                        <SelectItem value="Employment Contract">Employment Contract</SelectItem>
                        <SelectItem value="NDA & Compliance">NDA & Compliance</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File Name</Label>
                <Input
                  value={formData.fileName}
                  onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reqSig"
                checked={formData.requiresSignature}
                onChange={(e) => setFormData({ ...formData, requiresSignature: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <Label htmlFor="reqSig" className="cursor-pointer">
                Requires Employee Acknowledgement Sign-off
              </Label>
            </div>
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Input
                placeholder="Version notes or distribution scope..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => uploadMutation.mutate(formData)}
              disabled={!formData.title || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Uploading..." : "Save to Vault"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
