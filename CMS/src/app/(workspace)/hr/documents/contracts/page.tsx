'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileSignature,
  Plus,
  Calendar,
  DollarSign,
  RefreshCw,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";

export default function HrEmployeeContractsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const [formData, setFormData] = useState({
    employeeId: "",
    contractTypeId: "",
    title: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    salary: 60000,
    notes: "",
  });

  const [renewalData, setRenewalData] = useState({
    startDate: "",
    endDate: "",
    title: "",
    contractTypeId: "",
    salary: 60000,
    notes: "",
  });

  const { data: overview } = useQuery({
    queryKey: ["hr-employee-contracts-overview"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/documents/contracts/overview");
        return res.data;
      } catch (e) {
        return null;
      }
    },
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
      toast.success("Employee contract issued successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts-overview"] });
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

  const renewMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.post(`/hr/documents/contracts/${id}/renew`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Contract renewed successfully. Predecessor contract archived.");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts-overview"] });
      setIsRenewOpen(false);
      setSelectedContract(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to renew contract");
    },
  });

  const openRenewalDialog = (contract: any) => {
    setSelectedContract(contract);
    let defaultStart = new Date().toISOString().split("T")[0];
    if (contract.endDate) {
      const end = new Date(contract.endDate);
      end.setDate(end.getDate() + 1);
      defaultStart = end.toISOString().split("T")[0];
    }
    setRenewalData({
      startDate: defaultStart,
      endDate: "",
      title: `${contract.title} (Renewed)`,
      contractTypeId: contract.contractTypeId || "",
      salary: Number(contract.salary || 60000),
      notes: `Renewal of contract ${contract.title}`,
    });
    setIsRenewOpen(true);
  };

  const now = new Date();

  // Metrics
  const totalContracts = overview?.counts?.total ?? contracts.length;
  const activeContracts = overview?.counts?.active ?? contracts.filter((c: any) => c.status === "active").length;
  const expiring30 = overview?.counts?.expiring30Days ?? contracts.filter((c: any) => {
    if (c.status !== "active" || !c.endDate) return false;
    const diff = Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  }).length;
  const urgentExpiring = overview?.counts?.expiring7Days ?? contracts.filter((c: any) => {
    if (c.status !== "active" || !c.endDate) return false;
    const diff = Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }).length;
  const expiredContracts = overview?.counts?.expired ?? contracts.filter((c: any) => {
    if (c.status === "expired") return true;
    if (c.status === "active" && c.endDate && new Date(c.endDate).getTime() < now.getTime()) return true;
    return false;
  }).length;

  const filteredContracts = contracts.filter((c: any) => {
    const end = c.endDate ? new Date(c.endDate) : null;
    const diff = end ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    if (activeTab === "ACTIVE") return c.status === "active";
    if (activeTab === "EXPIRING_SOON") return c.status === "active" && diff !== null && diff >= 0 && diff <= 30;
    if (activeTab === "EXPIRED") return c.status === "expired" || (c.status === "active" && diff !== null && diff < 0);
    if (activeTab === "RENEWED") return c.status === "renewed";
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Employment Contracts"
        description="Legal agreements, appointment terms, compensation schedules, expiry monitoring, and contract renewals."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Issue Contract
        </Button>
      </PageHeader>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Agreements"
          value={totalContracts.toString()}
          icon={<FileSignature className="h-5 w-5 text-blue-500" />}
          description="Issued contract records"
        />
        <StatCard
          title="Active Contracts"
          value={activeContracts.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="In force agreements"
        />
        <StatCard
          title="Expiring (30 Days)"
          value={expiring30.toString()}
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          description="Renewal review window"
        />
        <StatCard
          title="Urgent (7 Days)"
          value={urgentExpiring.toString()}
          icon={<Clock className="h-5 w-5 text-orange-500" />}
          description="Action needed immediately"
        />
        <StatCard
          title="Expired / Action Req."
          value={expiredContracts.toString()}
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          description="Requires renewal or closure"
        />
      </div>

      {/* CONTRACTS TABLE */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-indigo-500" />
              <span>Registered Contracts</span>
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL", label: `All (${contracts.length})` },
                { id: "ACTIVE", label: `Active (${activeContracts})` },
                { id: "EXPIRING_SOON", label: `Expiring Soon (${expiring30})` },
                { id: "EXPIRED", label: `Expired (${expiredContracts})` },
                { id: "RENEWED", label: `Renewed` },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="h-8 text-xs"
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract Title</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date / Timeline</TableHead>
                <TableHead>Salary / Retainer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading contracts...
                  </TableCell>
                </TableRow>
              ) : filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No contracts match the selected filter. Click "Issue Contract" to draft one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((c: any) => {
                  const end = c.endDate ? new Date(c.endDate) : null;
                  const daysRemaining = end
                    ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isExpiringUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;
                  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 7;
                  const isPastDue = daysRemaining !== null && daysRemaining < 0;

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div>
                          <span>{c.title}</span>
                          {c.notes && (
                            <span className="block text-xs text-muted-foreground truncate max-w-xs">
                              {c.notes}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {c.employee?.firstName} {c.employee?.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.employee?.employeeCode}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.contractType?.name || "Standard"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(c.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.endDate ? (
                          <div className="flex items-center gap-1.5">
                            <span>{new Date(c.endDate).toLocaleDateString()}</span>
                            {c.status === "active" && (
                              <Badge
                                variant={
                                  isPastDue
                                    ? "destructive"
                                    : isExpiringUrgent
                                    ? "destructive"
                                    : isExpiringSoon
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {isPastDue
                                  ? `${Math.abs(daysRemaining!)}d expired`
                                  : `${daysRemaining}d left`}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Permanent / Indefinite</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-600">
                        ₹{Number(c.salary || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.status === "active"
                              ? "default"
                              : c.status === "renewed"
                              ? "secondary"
                              : c.status === "expired"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {c.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status !== "renewed" && c.status !== "terminated" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRenewalDialog(c)}
                            className="gap-1.5 text-xs"
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
                            Renew
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Archived</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE CONTRACT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Employee Contract</DialogTitle>
            <DialogDescription>Draft an employment agreement with terms and compensation.</DialogDescription>
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
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.title || createMutation.isPending}
            >
              {createMutation.isPending ? "Issuing..." : "Issue Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RENEW CONTRACT DIALOG */}
      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renew Employment Contract</DialogTitle>
            <DialogDescription>
              Renew contract terms for {selectedContract?.employee?.firstName}{" "}
              {selectedContract?.employee?.lastName}. Predecessor agreement will be atomically archived as
              'renewed'.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800 border border-blue-200">
              <strong>Predecessor Agreement:</strong> {selectedContract?.title} (
              {selectedContract?.startDate?.slice(0, 10)} to {selectedContract?.endDate?.slice(0, 10) || "Indefinite"})
            </div>
            <div className="space-y-2">
              <Label>Renewed Contract Title</Label>
              <Input
                value={renewalData.title}
                onChange={(e) => setRenewalData({ ...renewalData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contract Type</Label>
              <Select
                value={renewalData.contractTypeId}
                onValueChange={(val) => setRenewalData({ ...renewalData, contractTypeId: val })}
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
                <Label>New Start Date</Label>
                <Input
                  type="date"
                  value={renewalData.startDate}
                  onChange={(e) => setRenewalData({ ...renewalData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>New End Date</Label>
                <Input
                  type="date"
                  value={renewalData.endDate}
                  onChange={(e) => setRenewalData({ ...renewalData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Revised Salary / Monthly CTC (₹)</Label>
              <Input
                type="number"
                value={renewalData.salary}
                onChange={(e) => setRenewalData({ ...renewalData, salary: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Renewal Notes & Terms</Label>
              <Textarea
                value={renewalData.notes}
                onChange={(e) => setRenewalData({ ...renewalData, notes: e.target.value })}
                placeholder="Terms changes, compensation revision notes, or performance remarks..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenewOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                if (selectedContract) {
                  renewMutation.mutate({
                    id: selectedContract.id,
                    payload: renewalData,
                  });
                }
              }}
              disabled={!renewalData.startDate || renewMutation.isPending}
            >
              {renewMutation.isPending ? "Renewing..." : "Execute Contract Renewal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
