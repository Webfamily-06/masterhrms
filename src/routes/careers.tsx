import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { formatSystemAmount } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Search,
  Building2,
  Send,
  CheckCircle2,
  Globe,
  FileText,
  User,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

const searchSchema = z.object({
  tenant: z.string().optional(),
  job: z.string().optional(),
});

export const Route = createFileRoute("/careers")({
  validateSearch: searchSchema,
  component: PublicCareersPage,
  head: () => ({
    meta: [
      { title: "Careers & Open Positions — Master HRMS" },
      { name: "description", content: "Explore exciting career opportunities and apply online." },
    ],
  }),
});

function PublicCareersPage() {
  const { tenant: searchTenant, job: searchJob } = Route.useSearch();
  const tenantSlug = searchTenant || "default";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Application form state
  const [applyForm, setApplyForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    yearsOfExperience: "3",
    currentCompany: "",
    expectedSalary: "",
    portfolioUrl: "",
    resumeUrl: "",
    coverLetter: "",
  });

  // Query Public Careers data for tenant
  const { data: careersData, isLoading } = useQuery({
    queryKey: ["public-careers", tenantSlug],
    queryFn: async () => {
      try {
        return await api.get(`/public/jobs/${tenantSlug}`);
      } catch {
        return { tenant: null, jobs: [] };
      }
    },
  });

  const jobs = careersData?.jobs || [];
  const tenant = careersData?.tenant;

  // Apply mutation
  const applyMut = useMutation({
    mutationFn: async ({ jobId, payload }: { jobId: string; payload: any }) =>
      api.post(`/public/jobs/${jobId}/apply`, payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Application submitted successfully!");
      setIsApplyModalOpen(false);
      setApplyForm({
        fullName: "",
        email: "",
        phone: "",
        yearsOfExperience: "3",
        currentCompany: "",
        expectedSalary: "",
        portfolioUrl: "",
        resumeUrl: "",
        coverLetter: "",
      });
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit application"),
  });

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j: any) => {
      if (j.department?.name) set.add(j.department.name);
    });
    return Array.from(set);
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j: any) => {
      const matchesDept = selectedDept === "all" || j.department?.name === selectedDept;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        j.title?.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    });
  }, [jobs, selectedDept, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-8 max-w-[160px] object-contain"  loading="lazy"/>
            ) : (
              <div className="flex items-center gap-2 font-black text-lg text-foreground">
                <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-black">
                  {tenant?.name?.[0] || "M"}
                </div>
                <span>{tenant?.name || "Master HRMS Careers"}</span>
              </div>
            )}
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="outline" className="shadow-2xs" />
            <Link to="/auth">
              <Button size="sm" variant="outline" className="text-xs font-semibold h-8">
                Employee Portal Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/5 via-background to-background border-b text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs py-0.5 px-3">
            🚀 We're Hiring Ambitious Talent
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Build the future with {tenant?.name || "our team"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Discover exciting career opportunities, work on cutting-edge enterprise technology, and accelerate your career.
          </p>

          {/* Search & Filter Bar */}
          <div className="pt-4 max-w-2xl mx-auto flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search job title, skills, location..."
                className="pl-9 h-10 text-xs bg-card"
              />
            </div>

            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="h-10 text-xs sm:w-48 bg-card">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Jobs Listing */}
      <main className="max-w-6xl mx-auto px-4 py-10 flex-1 w-full space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Briefcase className="size-4 text-primary" /> Open Positions ({filteredJobs.length})
          </h2>
          <span className="text-xs text-muted-foreground">Updated in real-time</span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground text-sm">
            Loading career opportunities...
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="p-12 text-center space-y-3 border-dashed">
            <Briefcase className="size-10 mx-auto text-muted-foreground/50" />
            <h3 className="font-bold text-base">No matching positions found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              We don't currently have open positions matching your search filters. Check back regularly or reach out to our team directly.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredJobs.map((job: any) => (
              <Card
                key={job.id}
                className="p-5 border shadow-2xs hover:border-primary/50 transition-all bg-card flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-base text-foreground leading-snug">{job.title}</h3>
                      <div className="text-xs font-semibold text-primary">
                        {job.department?.name || "General Department"}
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {job.experienceLevel}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="size-3.5 text-primary" /> {job.location}
                    </span>
                    <span className="flex items-center gap-1 font-medium capitalize">
                      <Clock className="size-3.5 text-amber-500" /> {job.employmentType.replace("_", " ")}
                    </span>
                    {job.salaryMin && (
                      <span className="flex items-center gap-1 font-mono font-bold text-emerald-600">
                        <DollarSign className="size-3.5" /> ₹{Number(job.salaryMin).toLocaleString()}
                        {job.salaryMax ? ` - ₹${Number(job.salaryMax).toLocaleString()}` : "+"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    Slots: {job.openingsCount || 1} position(s)
                  </span>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedJob(job);
                      setIsApplyModalOpen(true);
                    }}
                    className="text-xs font-bold h-8 gap-1.5 shadow-sm"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-muted/20 text-center text-xs text-muted-foreground mt-auto">
        <p>© {new Date().getFullYear()} {tenant?.name || "Master HRMS"} Careers. Powered by Global HRMS Platform.</p>
      </footer>

      {/* ─── CANDIDATE APPLICATION MODAL ─── */}
      {selectedJob && (
        <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Send className="size-5 text-primary" />
                <span>Apply for {selectedJob.title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedJob.location} · {selectedJob.department?.name || "General"} · {selectedJob.experienceLevel}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyMut.mutate({ jobId: selectedJob.id, payload: applyForm });
              }}
              className="space-y-3.5 py-2 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Full Legal Name *</Label>
                <Input
                  required
                  placeholder="e.g. John Doe"
                  value={applyForm.fullName}
                  onChange={(e) => setApplyForm({ ...applyForm, fullName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Email Address *</Label>
                  <Input
                    required
                    type="email"
                    placeholder="john@example.com"
                    value={applyForm.email}
                    onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Phone Number</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={applyForm.phone}
                    onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Years of Experience</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={applyForm.yearsOfExperience}
                    onChange={(e) => setApplyForm({ ...applyForm, yearsOfExperience: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Current Company</Label>
                  <Input
                    placeholder="e.g. Acme Corp / Freelance"
                    value={applyForm.currentCompany}
                    onChange={(e) => setApplyForm({ ...applyForm, currentCompany: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Expected Monthly Salary (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 65000"
                    value={applyForm.expectedSalary}
                    onChange={(e) => setApplyForm({ ...applyForm, expectedSalary: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Portfolio / LinkedIn URL</Label>
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    value={applyForm.portfolioUrl}
                    onChange={(e) => setApplyForm({ ...applyForm, portfolioUrl: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Resume Link (Google Drive / Dropbox URL)</Label>
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  value={applyForm.resumeUrl}
                  onChange={(e) => setApplyForm({ ...applyForm, resumeUrl: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cover Note / Brief Intro</Label>
                <Textarea
                  rows={2}
                  placeholder="Why are you a great fit for this role?"
                  value={applyForm.coverLetter}
                  onChange={(e) => setApplyForm({ ...applyForm, coverLetter: e.target.value })}
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button type="button" size="sm" variant="outline" onClick={() => setIsApplyModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={applyMut.isPending} className="text-xs font-bold gap-1.5">
                  <Send className="size-3.5" />
                  <span>Submit Application</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
