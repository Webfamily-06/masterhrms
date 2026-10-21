'use client';
import React, { useEffect, useState } from "react";
import {  createFileRoute, Link, useNavigate  } from "@/src/lib/router-compat";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, FileText, CheckCircle2, Clock, AlertTriangle, ArrowRight, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAuthHeaders } from "@/lib/api";
import { PlanGuard } from "@/components/plan-guard";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/dashboard"
)({
  component: PlanningDashboardPage,
});

export default function PlanningDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/planning/dashboard", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data || json);
      }
    } catch {
      toast.error("Failed to load planning dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PlanGuard moduleName="Strategic Planning" requiredPlan="growth">
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        <PlanningNavHeader active="dashboard" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Strategic Planning Studio</h1>
          <p className="text-muted-foreground text-sm">
            Real-time overview of organization challenges, charters, stage progression, and initiatives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/addons/planning/challenges/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Challenge
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/addons/planning/charters/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Charter
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-8 w-1/3" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6"><Skeleton className="h-48 w-full" /></Card>
            <Card className="p-6"><Skeleton className="h-48 w-full" /></Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Challenges</CardTitle>
                <Target className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.totalChallenges || 0}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span className="text-emerald-600 font-medium">{data?.positionTotals?.ongoing || 0} ongoing</span>
                  <span>•</span>
                  <span>{data?.positionTotals?.on_hold || 0} on hold</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Strategic Charters</CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.totalModels || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Active project roadmaps</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ending Soon</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{data?.endingSoon?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Due within 14 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.positionTotals?.finished || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
              </CardContent>
            </Card>
          </div>

          {/* Middle Row: Stage distribution & Ending Soon */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Charters by Stage</CardTitle>
                    <CardDescription>Kanban workflow progression</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/addons/planning/charters/kanban">
                      Kanban Board <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(!data?.modelsByStage || data.modelsByStage.length === 0) ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No stages configured.</p>
                ) : (
                  <div className="space-y-3">
                    {data.modelsByStage.map((s: any) => (
                      <div key={s.stageId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.stageColor }} />
                            {s.stageName}
                          </span>
                          <span className="font-semibold">{s.count} charters</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              backgroundColor: s.stageColor,
                              width: `${data.totalModels > 0 ? (s.count / data.totalModels) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Upcoming Challenge Deadlines</CardTitle>
                    <CardDescription>Challenges nearing target completion date</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/addons/planning/challenges">
                      All Challenges <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(!data?.endingSoon || data.endingSoon.length === 0) ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mx-auto mb-2" />
                    No urgent challenges expiring in the next 14 days.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.endingSoon.map((c: any) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 cursor-pointer text-xs"
                        onClick={() => navigate({ to: `/addons/planning/challenges/${c.id}` })}
                      >
                        <div>
                          <div className="font-semibold">{c.name}</div>
                          <div className="text-muted-foreground text-[11px] mt-0.5">
                            Category: {c.categoryName || "General"}
                          </div>
                        </div>
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(c.endAt), "MMM d, yyyy")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row: Recent Charters */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Charters</CardTitle>
                <CardDescription>Recently initiated strategic models</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/addons/planning/charters">View All Charters</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {(!data?.recentModels || data.recentModels.length === 0) ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground mb-3">No strategic charters created yet.</p>
                  <Button size="sm" asChild>
                    <Link to="/addons/planning/charters/new">Create Charter</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y text-xs">
                  {data.recentModels.map((m: any) => (
                    <div
                      key={m.id}
                      className="py-3 flex items-center justify-between hover:bg-muted/30 px-2 rounded cursor-pointer"
                      onClick={() => navigate({ to: `/addons/planning/charters/${m.id}` })}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: m.stageColor || "#3b82f6" }}
                        />
                        <div>
                          <span className="font-semibold text-foreground">{m.name}</span>
                          {m.challengeName && (
                            <span className="text-muted-foreground ml-2">({m.challengeName})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {m.stageName}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {m.statusName}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </PlanGuard>
  );
}
