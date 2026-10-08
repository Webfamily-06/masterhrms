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
import { Mail, Plus, Eye, Calendar, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/documents/letters")({
  component: HrLettersCenterPage,
});

export default function HrLettersCenterPage() {
  const queryClient = useQueryClient();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    templateId: "",
    letterType: "Appointment",
    title: "Official Appointment Letter",
  });

  const { data: letters = [], isLoading } = useQuery({
    queryKey: ["hr-generated-letters"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/letters");
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-picker-letters"],
    queryFn: async () => {
      const res = await api.get("/hr/employees");
      return res.data?.items || res.data || [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["hr-templates-picker-letters"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/templates");
      return res.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/documents/letters/generate", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Letter generated with dynamic token merging");
      queryClient.invalidateQueries({ queryKey: ["hr-generated-letters"] });
      setIsGenerateModalOpen(false);
      setSelectedLetter(data);
      setIsViewModalOpen(true);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to generate letter");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="HR Letters Center"
        description="Automated letter generation (Appointment, Experience, Relieving, Confirmation) with secure token merge."
      >
        <Button onClick={() => setIsGenerateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Generate Letter
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-500" />
            Issued Letters Registry ({letters.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Letter Title</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading issued letters...
                  </TableCell>
                </TableRow>
              ) : letters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No letters issued yet. Click "Generate Letter" to draft one.
                  </TableCell>
                </TableRow>
              ) : (
                letters.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.title}</TableCell>
                    <TableCell>
                      <div>{l.employee?.firstName} {l.employee?.lastName}</div>
                      <div className="text-xs text-muted-foreground">{l.employee?.employeeCode}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.letterType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(l.issuedAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLetter(l);
                          setIsViewModalOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Letter
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generate Letter Modal */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Official HR Letter</DialogTitle>
            <DialogDescription>
              Select template and recipient. Employee details will be automatically populated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose recipient" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Letter Type</Label>
              <Select
                value={formData.letterType}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    letterType: val,
                    title: `Official ${val} Letter`,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Appointment">Appointment Letter</SelectItem>
                  <SelectItem value="Confirmation">Confirmation Letter</SelectItem>
                  <SelectItem value="Experience">Experience Certificate</SelectItem>
                  <SelectItem value="Relieving">Relieving Letter</SelectItem>
                  <SelectItem value="Bonafide">Bonafide Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template (Optional)</Label>
              <Select
                value={formData.templateId}
                onValueChange={(val) => setFormData({ ...formData, templateId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use default system format" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Letter Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => generateMutation.mutate(formData)}
              disabled={!formData.employeeId || generateMutation.isPending}
            >
              {generateMutation.isPending ? "Generating..." : "Generate & Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Letter Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLetter?.title}</DialogTitle>
            <DialogDescription>
              Issued on {selectedLetter ? new Date(selectedLetter.issuedAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          <div
            className="p-6 border rounded-lg bg-card text-foreground"
            dangerouslySetInnerHTML={{ __html: selectedLetter?.contentHtml || "" }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Print Letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
