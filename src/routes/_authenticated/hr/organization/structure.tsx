import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Network,
  Building2,
  Boxes,
  Award,
  Users,
  ChevronDown,
  ChevronRight,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/organization/structure")({
  component: OrgStructurePage,
  head: () => ({
    meta: [{ title: "Organization Structure & Hierarchy — Master HRMS" }],
  }),
});

interface OrgNode {
  id: string;
  name: string;
  employeeCode: string;
  position?: string;
  department?: { id: string; name: string };
  branch?: { id: string; name: string };
  designation?: { id: string; name: string };
  email?: string;
  phone?: string;
  status: string;
  subordinates: OrgNode[];
}

function OrgTreeNode({
  node,
  depth = 0,
  searchFilter = "",
}: {
  node: OrgNode;
  depth?: number;
  searchFilter?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubordinates = node.subordinates && node.subordinates.length > 0;

  const matchesSearch =
    !searchFilter ||
    node.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    node.employeeCode.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (node.position && node.position.toLowerCase().includes(searchFilter.toLowerCase())) ||
    (node.department?.name &&
      node.department.name.toLowerCase().includes(searchFilter.toLowerCase()));

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
          matchesSearch
            ? "bg-card hover:border-primary/50 shadow-sm"
            : "opacity-40 bg-muted/20"
        } ${depth === 0 ? "border-primary/40 bg-primary/5" : ""}`}
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-center gap-3">
          {hasSubordinates ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted text-muted-foreground"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="h-6 w-6" />
          )}

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
            {node.name.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">{node.name}</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {node.employeeCode}
              </Badge>
              {depth === 0 && (
                <Badge variant="default" className="text-[10px] py-0 px-1.5">
                  Top Executive
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {node.position || node.designation?.name || "Member"} •{" "}
              {node.department?.name || "General"} • {node.branch?.name || "HQ"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasSubordinates && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              {node.subordinates.length} Direct Report{node.subordinates.length > 1 ? "s" : ""}
            </Badge>
          )}
          <Badge
            variant={node.status === "active" ? "default" : "secondary"}
            className="text-[11px]"
          >
            {node.status}
          </Badge>
        </div>
      </div>

      {isExpanded && hasSubordinates && (
        <div className="space-y-2 border-l border-border/60 pl-2">
          {node.subordinates.map((sub) => (
            <OrgTreeNode
              key={sub.id}
              node={sub}
              depth={depth + 1}
              searchFilter={searchFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgStructurePage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["org-structure"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/structure");
      return res.data || res;
    },
  });

  const stats = data?.stats || {
    totalBranches: 0,
    totalDepartments: 0,
    totalDesignations: 0,
    totalEmployees: 0,
    activeEmployees: 0,
  };

  const orgChart: OrgNode[] = data?.orgChart || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Hierarchy & Structure"
        description="Comprehensive organizational chart visualizing corporate leadership, department reporting paths, and operational span of control."
        icon={Network}
      />

      <StatsOverviewGrid>
        <StatCard
          title="Total Workforce"
          value={stats.totalEmployees}
          icon={Users}
          description={`${stats.activeEmployees} active reporting employees`}
        />
        <StatCard
          title="Departments"
          value={stats.totalDepartments}
          icon={Boxes}
          description="Business divisions & teams"
        />
        <StatCard
          title="Facilities / Branches"
          value={stats.totalBranches}
          icon={Building2}
          description="Operating regional offices"
        />
        <StatCard
          title="Job Designations"
          value={stats.totalDesignations}
          icon={Award}
          description="Standardized organizational levels"
        />
      </StatsOverviewGrid>

      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter reporting tree by employee name, code, or department..."
      />

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="font-semibold text-foreground">Reporting Tree View</h3>
            <p className="text-xs text-muted-foreground">
              Expand and collapse nodes to inspect direct reports and managerial hierarchies.
            </p>
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            <UserCheck className="h-3 w-3 text-primary" />
            Live Sync
          </Badge>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Building organizational reporting hierarchy...
          </div>
        ) : orgChart.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No employee hierarchy records found. Add employees in the Employee Directory to generate the tree.
          </div>
        ) : (
          <div className="space-y-3">
            {orgChart.map((rootNode) => (
              <OrgTreeNode
                key={rootNode.id}
                node={rootNode}
                depth={0}
                searchFilter={search}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
