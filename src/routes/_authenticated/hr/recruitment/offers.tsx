import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Award,
  Plus,
  CheckCircle2,
  Send,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/offers")({
  component: HrOffersPage,
});

export default function HrOffersPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [offerData, setOfferData] = useState({
    candidateId: "",
    jobPostingId: "",
    designation: "Software Engineer",
    department: "Engineering",
    annualCtc: 1200000,
    joiningDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  });

  // Queries
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["hr-offers"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; offers?: any[] }>("/hr/recruitment/offers");
      return Array.isArray(res) ? res : res.data || res.offers || [];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["hr-candidates-offer-eligible"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; candidates?: any[] }>("/hr/recruitment/candidates");
      return Array.isArray(res) ? res : res.data || res.candidates || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const monthlyGross = Math.round(Number(payload.annualCtc) / 12);
      return await api.post("/hr/recruitment/offers", {
        candidateId: payload.candidateId,
        jobPostingId: payload.jobPostingId || undefined,
        designation: payload.designation,
        department: payload.department,
        annualCtc: Number(payload.annualCtc),
        monthlyGross,
        joiningDate: payload.joiningDate,
        ctcStructure: {
          basic: Math.round(monthlyGross * 0.5),
          hra: Math.round(monthlyGross * 0.25),
          specialAllowance: Math.round(monthlyGross * 0.25),
        },
      });
    },
    onSuccess: () => {
      toast.success("Offer generated in DRAFT state");
      queryClient.invalidateQueries({ queryKey: ["hr-offers"] });
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create offer");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/hr/recruitment/offers/${id}/approve`, {});
    },
    onSuccess: () => {
      toast.success("Offer approved for dispatch");
      queryClient.invalidateQueries({ queryKey: ["hr-offers"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/hr/recruitment/offers/${id}/send`, {});
    },
    onSuccess: () => {
      toast.success("Offer letter emailed to candidate");
      queryClient.invalidateQueries({ queryKey: ["hr-offers"] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/hr/recruitment/offers/${id}/accept`, {});
    },
    onSuccess: () => {
      toast.success("Offer marked ACCEPTED! Onboarding workflow automatically initialized.");
      queryClient.invalidateQueries({ queryKey: ["hr-offers"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to accept offer");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return <Badge className="bg-emerald-600 text-white">Accepted</Badge>;
      case "approved":
        return <Badge className="bg-blue-500/10 text-blue-600">Approved</Badge>;
      case "sent":
        return <Badge className="bg-purple-500/10 text-purple-600">Sent</Badge>;
      case "pending_approval":
        return <Badge className="bg-amber-500/10 text-amber-600">Pending Approval</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "declined":
      case "revoked":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Offer Generation & CTC Structuring"
          description="Authoritative compensation offers linked to P4 payroll salary components with approval workflows and onboarding triggers."
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Offer
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Offers"
          value={offers.length.toString()}
          description="All generated offers"
          icon={<Award className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Pending Approval"
          value={offers.filter((o: any) => o.status === "pending_approval").length.toString()}
          description="Awaiting finance sign-off"
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Sent to Candidates"
          value={offers.filter((o: any) => o.status === "sent").length.toString()}
          description="Awaiting candidate decision"
          icon={<Send className="h-5 w-5 text-purple-600" />}
        />
        <StatCard
          title="Accepted & Onboarding"
          value={offers.filter((o: any) => o.status === "accepted").length.toString()}
          description="Converted into pre-joining"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      {/* Offers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Extended Offers Directory</CardTitle>
          <CardDescription>
            Approval hierarchy controls dispatch. Acceptance initializes onboarding checklist automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Designation & Department</TableHead>
                <TableHead>Compensation (Annual CTC)</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No offers extended yet.
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold">{item.candidate?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{item.candidate?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{item.designation}</div>
                      <div className="text-xs text-muted-foreground">{item.department}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-semibold">₹{(Number(item.annualCtc) / 100000).toFixed(2)} Lakhs</div>
                      <div className="text-xs text-muted-foreground">₹{Number(item.monthlyGross).toLocaleString()}/mo</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{new Date(item.joiningDate).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {item.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate(item.id)}
                          className="gap-1 text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Approve
                        </Button>
                      )}
                      {item.status === "approved" && (
                        <Button
                          size="sm"
                          onClick={() => sendMutation.mutate(item.id)}
                          className="gap-1 text-xs bg-primary text-primary-foreground"
                        >
                          <Send className="h-3 w-3" /> Send Offer
                        </Button>
                      )}
                      {item.status === "sent" && (
                        <Button
                          size="sm"
                          onClick={() => acceptMutation.mutate(item.id)}
                          className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <UserCheck className="h-3 w-3" /> Mark Accepted
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Offer Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Offer Letter</DialogTitle>
            <DialogDescription>
              Specify approved compensation package adhering to P4 salary components.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Select Candidate *</Label>
              <Select
                value={offerData.candidateId}
                onValueChange={(val) => setOfferData({ ...offerData, candidateId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose candidate..." />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Designation</Label>
              <Input
                value={offerData.designation}
                onChange={(e) => setOfferData({ ...offerData, designation: e.target.value })}
              />
            </div>

            <div>
              <Label>Department</Label>
              <Input
                value={offerData.department}
                onChange={(e) => setOfferData({ ...offerData, department: e.target.value })}
              />
            </div>

            <div>
              <Label>Annual CTC (₹) *</Label>
              <Input
                type="number"
                value={offerData.annualCtc}
                onChange={(e) => setOfferData({ ...offerData, annualCtc: Number(e.target.value) })}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Estimated Monthly Gross: ₹{Math.round(offerData.annualCtc / 12).toLocaleString()}
              </div>
            </div>

            <div>
              <Label>Joining Date *</Label>
              <Input
                type="date"
                value={offerData.joiningDate}
                onChange={(e) => setOfferData({ ...offerData, joiningDate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!offerData.candidateId || createMutation.isPending}
              onClick={() => createMutation.mutate(offerData)}
            >
              {createMutation.isPending ? "Generating..." : "Generate Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
