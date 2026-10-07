import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Building2,
  ShieldCheck,
  FileText,
  Clock,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  ArrowLeft,
  Users,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/employees/$id")({
  component: Employee360Page,
  head: () => ({
    meta: [{ title: "Employee 360 Consolidated Profile — Master HRMS" }],
  }),
});

export function Employee360Page() {
  const { id } = Route.useParams();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: responseData, isLoading, error } = useQuery({
    queryKey: ["employee-360", id],
    queryFn: async () => {
      const res = await api.get(`/hr/employees/${id}`);
      return res.data || res;
    },
  });

  const emp = responseData;

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading Employee 360 consolidated profile...
      </div>
    );
  }

  if (error || !emp) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive font-medium">Failed to load employee profile.</p>
        <Link to="/hr/employees">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and Header */}
      <div className="flex items-center gap-2">
        <Link to="/hr/employees">
          <Button variant="ghost" size="sm" className="gap-1.5 h-8">
            <ArrowLeft className="h-4 w-4" />
            Directory
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xl font-bold">
              {emp.firstName?.slice(0, 1)}
              {emp.lastName?.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">
                  {emp.firstName} {emp.lastName}
                </h2>
                <Badge variant={emp.status === "active" ? "default" : "secondary"}>
                  {emp.status}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {emp.employeeCode}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {emp.position || emp.designation?.name || "Member"} •{" "}
                {emp.department?.name || "General"} • {emp.branch?.name || "Corporate HQ"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-xs py-1 px-2.5 capitalize">
              <Briefcase className="h-3 w-3" />
              {emp.employmentType?.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </div>

      {/* 360 Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <User className="h-3.5 w-3.5" />
            Overview & Job
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-1.5 text-xs">
            <Phone className="h-3.5 w-3.5" />
            Personal & Contact
          </TabsTrigger>
          <TabsTrigger value="statutory" className="gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Statutory & Bank
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Hierarchy & Team
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" />
            Lifecycle & Requests
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & JOB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Employment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Employee Code</span>
                  <span className="font-mono font-medium">{emp.employeeCode}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Official Designation</span>
                  <span className="font-medium">{emp.designation?.name || emp.position || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{emp.department?.name || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Assigned Branch</span>
                  <span className="font-medium">{emp.branch?.name || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Employment Classification</span>
                  <span className="font-medium capitalize">{emp.employmentType?.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Date of Joining</span>
                  <span className="font-medium">
                    {emp.joinedAt ? format(new Date(emp.joinedAt), "dd MMMM yyyy") : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Managerial Reporting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="py-2 border-b">
                  <span className="text-muted-foreground">Direct Reporting Manager:</span>
                  {emp.manager ? (
                    <div className="mt-1 font-semibold text-foreground text-sm">
                      {emp.manager.firstName} {emp.manager.lastName} ({emp.manager.employeeCode})
                    </div>
                  ) : (
                    <div className="mt-1 text-muted-foreground italic">
                      Top Executive (Reports to Board / Workspace Admin)
                    </div>
                  )}
                </div>

                <div className="py-2">
                  <span className="text-muted-foreground">Direct Subordinates Count:</span>
                  <div className="mt-1 font-semibold text-foreground text-sm">
                    {emp.subordinates?.length || 0} Direct Reports
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: PERSONAL & CONTACT */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Contact & Demographic Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2 py-1.5 border-b">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{emp.email}</span>
                </div>
                <div className="flex items-center gap-2 py-1.5 border-b">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{emp.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 py-1.5 border-b">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <span className="font-medium">
                    {emp.dateOfBirth ? format(new Date(emp.dateOfBirth), "dd MMM yyyy") : "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 py-1.5 border-b">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Gender:</span>
                  <span className="font-medium capitalize">{emp.gender || "—"}</span>
                </div>
                <div className="flex items-center gap-2 py-1.5 border-b">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Work State:</span>
                  <span className="font-medium">{emp.workStateCode || emp.state || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: STATUTORY & BANK */}
        <TabsContent value="statutory" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                Protected Statutory & Banking Credentials (FLS Masked)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Permanent Account Number (PAN):</span>
                  <span className="font-mono font-medium">{emp.pan || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Aadhaar Identifier:</span>
                  <span className="font-mono font-medium">{emp.aadhaar || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Universal Account Number (UAN):</span>
                  <span className="font-mono font-medium">{emp.uan || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">ESIC Number:</span>
                  <span className="font-mono font-medium">{emp.esiNumber || "—"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Bank Institution:</span>
                  <span className="font-medium">{emp.bankName || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Disbursement Account:</span>
                  <span className="font-mono font-medium">{emp.bankAccount || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">IFSC Code:</span>
                  <span className="font-mono font-medium">{emp.bankIfsc || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Annual Gross / CTC:</span>
                  <span className="font-semibold text-emerald-600">
                    {emp.salary ? `₹${Number(emp.salary).toLocaleString()}` : "Masked"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: TEAM & HIERARCHY */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Direct Reporting Subordinates ({emp.subordinates?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emp.subordinates?.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No subordinates report directly to this employee.</p>
              ) : (
                <div className="divide-y text-xs">
                  {emp.subordinates?.map((sub: any) => (
                    <div key={sub.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{sub.firstName} {sub.lastName}</span>
                        <span className="text-muted-foreground ml-2 font-mono">({sub.employeeCode})</span>
                        <div className="text-muted-foreground text-[11px]">{sub.position || "Member"}</div>
                      </div>
                      <Badge variant="outline">{sub.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: LIFECYCLE & REQUESTS */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Self-Service Profile Change Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emp.changeRequests?.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No profile change requests filed.</p>
              ) : (
                <div className="divide-y text-xs">
                  {emp.changeRequests?.map((req: any) => (
                    <div key={req.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold uppercase">{req.fieldCategory}: {req.fieldKey}</span>
                        <div className="text-muted-foreground text-[11px]">
                          Submitted on {format(new Date(req.createdAt), "dd MMM yyyy")}
                        </div>
                      </div>
                      <Badge
                        variant={
                          req.status === "APPROVED"
                            ? "default"
                            : req.status === "REJECTED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {req.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
