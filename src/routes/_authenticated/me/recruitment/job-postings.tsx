import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, MapPin, Building2, Send, CheckCircle2, Search, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/recruitment/job-postings")({
  component: MeJobPostingsPage,
});

export default function MeJobPostingsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [applyModalJob, setApplyModalJob] = useState<any>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["me-job-postings"],
    queryFn: async () => {
      const res = await api.get<any[]>("/me/recruitment/job-postings");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return await api.post(`/me/recruitment/job-postings/${jobId}/apply`, {});
    },
    onSuccess: () => {
      toast.success("Internal transfer application submitted to HR recruitment team");
      setApplyModalJob(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit internal application");
    },
  });

  const filteredJobs = jobs.filter((j: any) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      j.title?.toLowerCase().includes(q) ||
      j.department?.name?.toLowerCase().includes(q) ||
      j.department?.toLowerCase?.().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Internal Job Opportunities & Transfers"
        description="Explore open positions across departments and submit internal applications or career transfer requests."
      />

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search jobs by title or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground border rounded-xl">
            No published internal job openings available at this time.
          </div>
        ) : (
          filteredJobs.map((job: any) => (
            <Card key={job.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg font-bold">{job.title}</CardTitle>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 shrink-0">
                    {job.openings || 1} Openings
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 pt-1 text-xs">
                  <Building2 className="h-3 w-3" />
                  <span>{job.department?.name || job.department || "General"}</span>
                  <span>•</span>
                  <MapPin className="h-3 w-3" />
                  <span>{job.branch?.name || job.location || "Bangalore HQ"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {job.description || "Exciting opportunity to grow your career within the organization."}
                </p>
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    Code: {job.jobCode || job.id.slice(0, 8)}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setApplyModalJob(job)}
                    className="gap-1 text-xs"
                  >
                    Apply Internally <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!applyModalJob} onOpenChange={(open) => !open && setApplyModalJob(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for {applyModalJob?.title}</DialogTitle>
            <DialogDescription>
              Your employee profile and tenure records will be submitted to the hiring manager for review.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
            <div><strong>Department:</strong> {applyModalJob?.department?.name || applyModalJob?.department || "General"}</div>
            <div><strong>Location:</strong> {applyModalJob?.branch?.name || applyModalJob?.location || "Bangalore HQ"}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyModalJob(null)}>
              Cancel
            </Button>
            <Button
              disabled={applyMutation.isPending}
              onClick={() => applyMutation.mutate(applyModalJob.id)}
            >
              {applyMutation.isPending ? "Submitting..." : "Confirm Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
