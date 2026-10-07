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
import { toast } from "sonner";
import { Share2, Plus, Users, Award, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/recruitment/career")({
  component: MeCareerPage,
});

export default function MeCareerPage() {
  const queryClient = useQueryClient();
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [referralData, setReferralData] = useState({
    jobTitle: "",
    refereeName: "",
    refereeEmail: "",
    refereePhone: "",
    relationship: "Professional Contact",
  });

  const { data: careerData, isLoading } = useQuery({
    queryKey: ["me-career"],
    queryFn: async () => {
      return await api.get<any>("/me/recruitment/career");
    },
  });

  const referrals = careerData?.referrals || [];

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/referrals", payload);
    },
    onSuccess: () => {
      toast.success("Referral submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["me-career"] });
      setIsSubmitOpen(false);
      setReferralData({
        jobTitle: "",
        refereeName: "",
        refereeEmail: "",
        refereePhone: "",
        relationship: "Professional Contact",
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit referral");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="My Career & Referrals Tracker"
          description="Submit candidates from your network and track their recruitment milestones."
        />
        <Button onClick={() => setIsSubmitOpen(true)} className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Refer a Colleague
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Submitted Referrals"
          value={referrals.length.toString()}
          description="Candidates introduced"
          icon={<Share2 className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Successful Hires"
          value={referrals.filter((r: any) => r.status === "hired").length.toString()}
          description="Joined the company"
          icon={<Award className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Under Review"
          value={referrals.filter((r: any) => r.status !== "hired" && r.status !== "rejected").length.toString()}
          description="Active in pipeline"
          icon={<CheckCircle2 className="h-5 w-5 text-amber-600" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Referrals History</CardTitle>
          <CardDescription>Track status as candidates progress through interviews and offers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Date Referred</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    You haven't submitted any referrals yet. Help your network join the team!
                  </TableCell>
                </TableRow>
              ) : (
                referrals.map((ref: any) => (
                  <TableRow key={ref.id}>
                    <TableCell className="font-semibold">{ref.refereeName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ref.refereeEmail}</TableCell>
                    <TableCell className="text-sm">{ref.jobTitle}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ref.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refer a Colleague</DialogTitle>
            <DialogDescription>
              Submit candidate details. They will be linked directly to our hiring team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Target Job Title *</Label>
              <Input
                placeholder="e.g. Senior Software Engineer"
                value={referralData.jobTitle}
                onChange={(e) => setReferralData({ ...referralData, jobTitle: e.target.value })}
              />
            </div>
            <div>
              <Label>Candidate Full Name *</Label>
              <Input
                placeholder="Jane Smith"
                value={referralData.refereeName}
                onChange={(e) => setReferralData({ ...referralData, refereeName: e.target.value })}
              />
            </div>
            <div>
              <Label>Candidate Email *</Label>
              <Input
                type="email"
                placeholder="jane@example.com"
                value={referralData.refereeEmail}
                onChange={(e) => setReferralData({ ...referralData, refereeEmail: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="+91 9876543210"
                value={referralData.refereePhone}
                onChange={(e) => setReferralData({ ...referralData, refereePhone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!referralData.refereeName.trim() || !referralData.refereeEmail.trim() || submitMutation.isPending}
              onClick={() => submitMutation.mutate(referralData)}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Referral"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
