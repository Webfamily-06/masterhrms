import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building,
  Mail,
  Phone,
  Briefcase,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useCurrentProfile } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/me/team")({
  component: MyTeamPage,
  head: () => ({
    meta: [{ title: "My Team & Direct Reports — Master HRMS" }],
  }),
});

interface TeamMember {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  phone?: string;
  position?: string;
  department?: { id: string; name: string };
  branch?: { id: string; name: string };
  designation?: { id: string; name: string };
  managerId?: string;
  manager?: { id: string; firstName: string; lastName: string };
  status?: string;
}

export function MyTeamPage() {
  const [search, setSearch] = useState("");
  const { data: profile } = useCurrentProfile();

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["my-team-members", profile?.id, search],
    queryFn: async () => {
      const res = await api.get("/me/employees", {
        params: { search: search || undefined, limit: 100 },
      });
      return res.data || res.items || res || [];
    },
  });

  const allColleagues: TeamMember[] = Array.isArray(responseData)
    ? responseData
    : (responseData?.data as any) || [];

  // Filter for direct reports when profile has id
  const teamMembers = allColleagues.filter((m) => {
    if (!profile?.id) return true;
    return m.managerId === profile.id || m.manager?.id === profile.id;
  });

  const displayList = teamMembers.length > 0 ? teamMembers : allColleagues;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="My Team"
          description="Manage and review your direct reports, attendance statuses, and performance overview."
        />
        <div className="flex items-center gap-2">
          <Link to="/me/approvals">
            <Button size="sm" className="gap-1.5 h-8 font-semibold text-xs">
              <CheckCircle2 className="size-3.5" />
              Team Approvals
            </Button>
          </Link>
        </div>
      </div>

      <FilterToolbar
        searchPlaceholder="Search team members by name or employee code..."
        searchQuery={search}
        onSearchChange={setSearch}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 h-36" />
            </Card>
          ))}
        </div>
      ) : displayList.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Users className="size-8 text-muted-foreground/60" />
            <p className="font-semibold text-sm">No direct reports found</p>
            <p className="text-xs">Your team members will appear here once assigned to you as direct manager.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayList.map((emp) => {
            const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Team Member";
            return (
              <Card key={emp.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm leading-tight text-foreground">{name}</h4>
                        <p className="text-xs text-muted-foreground">{emp.employeeCode || "EMP"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                      Active
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Briefcase className="size-3.5 text-muted-foreground/80 shrink-0" />
                      <span className="truncate">{emp.position || emp.designation?.name || "Team Member"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="size-3.5 text-muted-foreground/80 shrink-0" />
                      <span className="truncate">{emp.department?.name || "Department"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground/80 shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyTeamPage;
