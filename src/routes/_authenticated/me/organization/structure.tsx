import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Badge } from "@/components/ui/badge";
import {
  Network,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/organization/structure")({
  component: MyOrgStructurePage,
  head: () => ({
    meta: [{ title: "Organization Chart — Master HRMS" }],
  }),
});

interface OrgNode {
  id: string;
  name: string;
  employeeCode: string;
  position?: string;
  department?: { id: string; name: string };
  branch?: { id: string; name: string };
  email?: string;
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
        style={{ marginLeft: `${depth * 20}px` }}
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

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
            {node.name?.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">{node.name}</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                {node.employeeCode}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {node.position || "Member"} • {node.department?.name || "General"}
            </div>
          </div>
        </div>

        {hasSubordinates && (
          <Badge variant="secondary" className="text-[11px] gap-1">
            <Users className="h-3 w-3" />
            {node.subordinates.length}
          </Badge>
        )}
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

export function MyOrgStructurePage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["my-org-structure"],
    queryFn: async () => {
      const res = await api.get("/me/organization/structure");
      return res.data || res;
    },
  });

  const orgChart: OrgNode[] = data?.orgChart || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Chart"
        description="Explore leadership pathways and company-wide reporting relationships."
        icon={Network}
      />

      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Find team members in hierarchy..."
      />

      <div className="rounded-lg border bg-card p-6">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Building company hierarchy...
          </div>
        ) : orgChart.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No organizational hierarchy available.
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
