import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Building,
  Mail,
  Phone,
  Briefcase,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/employees")({
  component: MyColleaguesPage,
  head: () => ({
    meta: [{ title: "Colleague Directory — Master HRMS" }],
  }),
});

interface Colleague {
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
  manager?: { id: string; firstName: string; lastName: string };
}

export function MyColleaguesPage() {
  const [search, setSearch] = useState("");

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["my-colleagues-directory", search],
    queryFn: async () => {
      const res = await api.get("/me/employees", {
        params: { search: search || undefined, limit: 100 },
      });
      return res.data || res.items || res || [];
    },
  });

  const colleagues: Colleague[] = Array.isArray(responseData)
    ? responseData
    : (responseData?.data as any) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Directory"
        description="Find and connect with fellow team members and department colleagues across the workspace."
        icon={Users}
      />

      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search colleagues by name, code, department, or job title..."
      />

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">
          Loading company directory...
        </div>
      ) : colleagues.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No team members found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {colleagues.map((c) => (
            <Card key={c.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {c.firstName?.slice(0, 1)}
                    {c.lastName?.slice(0, 1)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{c.fullName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {c.position || c.designation?.name || "Team Member"}
                    </p>
                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono mt-0.5">
                      {c.employeeCode}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    <span>{c.department?.name || "General Department"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-primary" />
                    <span>{c.branch?.name || "Main Office"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                </div>

                {c.manager && (
                  <div className="text-[11px] text-muted-foreground pt-1 border-t flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-muted-foreground" />
                    <span>Reports to: {c.manager.firstName} {c.manager.lastName}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
