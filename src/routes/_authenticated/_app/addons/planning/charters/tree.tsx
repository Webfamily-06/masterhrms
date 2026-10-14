import React, { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronDown, ChevronRight, Target, FileText, Star, Users, Eye, Edit } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/charters/tree"
)({
  component: ChartersTreePage,
});

export default function ChartersTreePage() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [charters, setCharters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChallenges, setExpandedChallenges] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [chalRes, charRes] = await Promise.all([
        fetch("/api/v1/addons/planning/challenges", { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/planning/models?type=charter", { headers: getAuthHeaders() }),
      ]);

      if (chalRes.ok) {
        const chalJson = await chalRes.json();
        const list = chalJson.data || (Array.isArray(chalJson) ? chalJson : []);
        setChallenges(list);
        // Auto-expand all by default
        const initExpand: Record<string, boolean> = { standalone: true };
        list.forEach((c: any) => {
          initExpand[c.id] = true;
        });
        setExpandedChallenges(initExpand);
      }

      if (charRes.ok) {
        const charJson = await charRes.json();
        setCharters(charJson.data || (Array.isArray(charJson) ? charJson : []));
      }
    } catch {
      toast.error("Failed to load hierarchy tree");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedChallenges((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const standaloneCharters = charters.filter((c) => !c.challengeId);

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <PlanningNavHeader active="charters" charterView="tree" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Charters Tree Hierarchy</h1>
          <p className="text-muted-foreground text-sm">
            Challenge-to-Charter breakdown view with expand/collapse control and progress status.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/addons/planning/charters/new">
            <Plus className="mr-1.5 h-4 w-4" /> Create Charter
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-8 w-1/3 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : challenges.length === 0 && standaloneCharters.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-base mb-1">No strategic initiatives mapped</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Create challenges and associate charters to see your organizational hierarchy tree.
          </p>
          <Button asChild size="sm">
            <Link to="/addons/planning/challenges/new">Create Challenge</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Challenge groups */}
          {challenges.map((challenge) => {
            const childCharters = charters.filter((c) => c.challengeId === challenge.id);
            const isExpanded = !!expandedChallenges[challenge.id];

            return (
              <Card key={challenge.id} className="overflow-hidden border">
                {/* Challenge Header Bar */}
                <div
                  className="p-4 bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between cursor-pointer border-b"
                  onClick={() => toggleExpand(challenge.id)}
                >
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <Target className="h-4 w-4 text-indigo-500 shrink-0" />
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        {challenge.name}
                        <Badge variant="outline" className="text-[10px]">
                          {challenge.categoryName || "General"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Due {format(new Date(challenge.endAt), "MMM d, yyyy")} • Position: {challenge.position}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs font-mono">
                      {childCharters.length} charter{childCharters.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>

                {/* Nested Charters List */}
                {isExpanded && (
                  <CardContent className="p-4 bg-card">
                    {childCharters.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-3 text-center">
                        No charters linked to this challenge yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {childCharters.map((charter) => (
                          <div
                            key={charter.id}
                            className="p-3 border rounded-lg hover:border-primary/50 transition-colors bg-card cursor-pointer space-y-2 flex flex-col justify-between"
                            onClick={() => navigate({ to: `/addons/planning/charters/${charter.id}` })}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: charter.stageColor || "#3b82f6" }}
                                />
                                <span className="font-semibold text-xs leading-tight line-clamp-1">
                                  {charter.name}
                                </span>
                              </div>
                              <Badge variant="secondary" className="text-[10px] shrink-0">
                                {charter.stageName}
                              </Badge>
                            </div>

                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {charter.description || "No description."}
                            </p>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                              <Badge variant="outline" className="text-[9px]">
                                {charter.statusName}
                              </Badge>
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                                  <Star className="h-3 w-3 fill-amber-500" />
                                  {charter.ratingAvg > 0 ? charter.ratingAvg : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Standalone charters if any */}
          {standaloneCharters.length > 0 && (
            <Card className="overflow-hidden border">
              <div
                className="p-4 bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between cursor-pointer border-b"
                onClick={() => toggleExpand("standalone")}
              >
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    {expandedChallenges["standalone"] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-foreground">Standalone Initiatives</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Charters without a parent challenge</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-mono">
                  {standaloneCharters.length}
                </Badge>
              </div>

              {expandedChallenges["standalone"] && (
                <CardContent className="p-4 bg-card">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {standaloneCharters.map((charter) => (
                      <div
                        key={charter.id}
                        className="p-3 border rounded-lg hover:border-primary/50 transition-colors bg-card cursor-pointer space-y-2 flex flex-col justify-between"
                        onClick={() => navigate({ to: `/addons/planning/charters/${charter.id}` })}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs leading-tight line-clamp-1">
                            {charter.name}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {charter.stageName}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {charter.description || "No description."}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
