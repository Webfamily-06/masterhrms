import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Globe,
  Share2,
  ExternalLink,
  Eye,
  CheckCircle2,
  Copy,
  Users,
  Briefcase,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/career-site")({
  component: HrCareerSitePage,
});

export default function HrCareerSitePage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: jobList = [], isLoading } = useQuery({
    queryKey: ["hr-job-postings"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; jobs?: any[] }>("/hr/recruitment/job-postings");
      return Array.isArray(res) ? res : res.data || res.jobs || [];
    },
  });

  const publishedJobs = jobList.filter((j: any) => j.status === "published" || j.status === "open");

  const copyCareerSiteLink = () => {
    const url = `${window.location.origin}/careers`;
    navigator.clipboard.writeText(url);
    toast.success("Public Career Portal link copied to clipboard!");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Career Site & Public Job Portal"
          description="Manage public job visibility, vacancy publication channels, and inbound applicant ingestion from /careers."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={copyCareerSiteLink}
            className="gap-2"
          >
            <Copy className="h-4 w-4" /> Copy Public Portal URL
          </Button>
          <a
            href="/careers"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow-sm h-9 px-4 gap-2"
          >
            <ExternalLink className="h-4 w-4" /> Preview Live Portal
          </a>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Public Vacancies"
          value={publishedJobs.length.toString()}
          description="Actively accepting resumes"
          icon={<Globe className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Branded Careers URL"
          value="Live"
          description="/careers"
          icon={<Share2 className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Inbound Ingestion"
          value="Automated"
          description="Direct into JobCandidate"
          icon={<CheckCircle2 className="h-5 w-5 text-purple-600" />}
        />
        <StatCard
          title="Security Isolation"
          value="Strict"
          description="Public API sanitization"
          icon={<Eye className="h-5 w-5 text-amber-600" />}
        />
      </div>

      {/* Active Public Openings */}
      <Card>
        <CardHeader>
          <CardTitle>Published Openings on Career Site</CardTitle>
          <CardDescription>
            Candidates applying to these roles are automatically screened and injected into the Recruitment Pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title & Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Openings</TableHead>
                <TableHead>Career Portal Visibility</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publishedJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No active published jobs on the career portal. Publish an approved job posting to show it here.
                  </TableCell>
                </TableRow>
              ) : (
                publishedJobs.map((job: any) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="font-semibold">{job.title}</div>
                      <div className="text-xs font-mono text-muted-foreground">{job.jobCode || job.id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell className="text-sm">{job.department}</TableCell>
                    <TableCell className="text-sm">{job.location || "Bangalore HQ"}</TableCell>
                    <TableCell className="text-sm font-medium">{job.openings || 1}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        Visible on /careers
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`/careers?job=${job.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-2.5 gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> View Listing
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
