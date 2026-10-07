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
  Share2,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  UserCheck,
  Award,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/referrals")({
  component: HrReferralsPage,
});

export default function HrReferralsPage() {
  const queryClient = useQueryClient();
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    jobTitle: "Software Engineer",
    refereeName: "",
    refereeEmail: "",
    refereePhone: "",
    relationship: "Former Colleague",
  });

  // Queries
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["hr-referrals"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; referrals?: any[] }>("/hr/recruitment/referrals");
      return Array.isArray(res) ? res : res.data || res.referrals || [];
    },
  });

  // Submit Referral Mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/referrals", payload);
    },
    onSuccess: () => {
      toast.success("Employee referral submitted and candidate added to talent pipeline");
      queryClient.invalidateQueries({ queryKey: ["hr-referrals"] });
      setIsSubmitOpen(false);
      setFormData({
        jobTitle: "Software Engineer",
        refereeName: "",
        refereeEmail: "",
        refereePhone: "",
        relationship: "Former Colleague",
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit referral");
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await api.post(`/hr/recruitment/referrals/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success("Referral status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-referrals"] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "hired":
        return <Badge className="bg-emerald-600 text-white">Hired</Badge>;
      case "interviewed":
        return <Badge className="bg-blue-500/10 text-blue-600">Interviewed</Badge>;
      case "reviewing":
        return <Badge className="bg-amber-500/10 text-amber-600">Reviewing</Badge>;
      case "submitted":
        return <Badge variant="outline">Submitted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Employee Referrals Program"
          description="Internal workforce candidate endorsements linked directly into the talent acquisition funnel."
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsSubmitOpen(true)}
            className="gap-2 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" /> Submit Referral
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Referrals"
          value={referrals.length.toString()}
          description="Employee recommendations"
          icon={<Share2 className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Under Review"
          value={referrals.filter((r: any) => r.status === "reviewing" || r.status === "submitted").length.toString()}
          description="Active screening"
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="In Interviews"
          value={referrals.filter((r: any) => r.status === "interviewed").length.toString()}
          description="Advanced rounds"
          icon={<Users className="h-5 w-5 text-purple-600" />}
        />
        <StatCard
          title="Referral Hires"
          value={referrals.filter((r: any) => r.status === "hired").length.toString()}
          description="Successful conversions"
          icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referred Candidates</CardTitle>
          <CardDescription>
            Candidates introduced by internal staff. Each referral feeds the unified talent pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Target Position</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No referrals submitted yet.
                  </TableCell>
                </TableRow>
              ) : (
                referrals.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold">{item.refereeName}</div>
                      <div className="text-xs text-muted-foreground">{item.refereeEmail}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{item.jobTitle}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{item.referrer?.name || "Internal Staff"}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Select
                        value={item.status}
                        onValueChange={(val) => updateStatusMutation.mutate({ id: item.id, status: val })}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs inline-flex">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="interviewed">Interviewed</SelectItem>
                          <SelectItem value="hired">Hired</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Submit Referral Dialog */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Employee Referral</DialogTitle>
            <DialogDescription>
              Introduce a skilled candidate for active requisitions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Target Job Title *</Label>
              <Input
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              />
            </div>

            <div>
              <Label>Candidate Full Name *</Label>
              <Input
                placeholder="Jane Smith"
                value={formData.refereeName}
                onChange={(e) => setFormData({ ...formData, refereeName: e.target.value })}
              />
            </div>

            <div>
              <Label>Candidate Email *</Label>
              <Input
                type="email"
                placeholder="jane@example.com"
                value={formData.refereeEmail}
                onChange={(e) => setFormData({ ...formData, refereeEmail: e.target.value })}
              />
            </div>

            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="+91 9876543210"
                value={formData.refereePhone}
                onChange={(e) => setFormData({ ...formData, refereePhone: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.refereeName.trim() || !formData.refereeEmail.trim() || submitMutation.isPending}
              onClick={() => submitMutation.mutate(formData)}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Referral"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
