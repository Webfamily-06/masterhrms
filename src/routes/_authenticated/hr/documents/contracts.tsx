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
import { FileSignature, Plus, Calendar, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/documents/contracts")({
  component: HrEmployeeContractsPage,
});

export default function HrEmployeeContractsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    contractTypeId: "",
    title: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    salary: 60000,
    notes: "",
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["hr-employee-contracts"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/contracts");
      return res.data;
    },
  });

  const { data: contractTypes = [] } = useQuery({
    queryKey: ["hr-contract-types-picker"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/contract-types");
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-picker-contracts"],
    queryFn: async () => {
      const res = await api.get("/hr/employees");
      return res.data?.items || res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/documents/contracts", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Employee contract created");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        contractTypeId: "",
        title: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        salary: 60000,
        notes: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create contract");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Employee Employment Contracts"
        description="Legal agreements, appointment terms, compensation schedules, and contract renewals."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Contract
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-indigo-500" />
            Active Contracts ({contracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract Title</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Contract Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Salary / Retainer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading contracts...
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No employee contracts registered. Click "Create Contract" to draft one.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>
                      <div>{c.employee?.firstName} {c.employee?.lastName}</div>
                      <div className="text-xs text-muted-foreground">{c.employee?.employeeCode}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.contractType?.name || "Standard"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(c.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.endDate ? new Date(c.endDate).toLocaleDateString() : "Indefinite / Permanent"}
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      ₹{Number(c.salary || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>
                        {c.status}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Employee Contract</DialogTitle>
            <DialogDescription>Draft an employment agreement with terms and salary.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee" />
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
              <Label>Contract Title</Label>
              <Input
                placeholder="e.g. Senior Software Engineer Employment Contract"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contract Type</Label>
              <Select
                value={formData.contractTypeId}
                onValueChange={(val) => setFormData({ ...formData, contractTypeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Salary / Monthly CTC (₹)</Label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.title || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Issue Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
