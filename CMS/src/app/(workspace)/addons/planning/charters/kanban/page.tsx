'use client';
import React, { useEffect, useState } from "react";
import {  createFileRoute, Link, useNavigate  } from "@/src/lib/router-compat";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Eye, Edit, Trash2, Star, Users, GripVertical, FileText } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/charters/kanban"
)({
  component: ChartersKanbanPage,
});

export default function ChartersKanbanPage() {
  const navigate = useNavigate();
  const [stages, setStages] = useState<any[]>([]);
  const [charters, setCharters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedCharterId, setDraggedCharterId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stgRes, charRes] = await Promise.all([
        fetch("/api/v1/addons/planning/stages", { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/planning/models?type=charter", { headers: getAuthHeaders() }),
      ]);

      if (stgRes.ok) {
        const stgJson = await stgRes.json();
        setStages(stgJson.data || (Array.isArray(stgJson) ? stgJson : []));
      }
      if (charRes.ok) {
        const charJson = await charRes.json();
        setCharters(charJson.data || (Array.isArray(charJson) ? charJson : []));
      }
    } catch {
      toast.error("Failed to load kanban board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDragStart = (e: React.DragEvent, charterId: string) => {
    e.dataTransfer.setData("text/plain", charterId);
    setDraggedCharterId(charterId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStageId: string) => {
    e.preventDefault();
    const charterId = e.dataTransfer.getData("text/plain") || draggedCharterId;
    if (!charterId) return;

    const charter = charters.find((c) => c.id === charterId);
    if (!charter || charter.stageId === newStageId) {
      setDraggedCharterId(null);
      return;
    }

    // Optimistic UI update
    setCharters((prev) =>
      prev.map((c) => (c.id === charterId ? { ...c, stageId: newStageId } : c))
    );
    setDraggedCharterId(null);

    try {
      const res = await fetch(`/api/v1/addons/planning/models/${charterId}/stage`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ stageId: newStageId }),
      });

      if (res.ok) {
        toast.success("Charter stage updated!");
      } else {
        toast.error("Failed to update stage");
        fetchData(); // Rollback
      }
    } catch {
      toast.error("Network error moving charter");
      fetchData();
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete charter "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/addons/planning/models/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Charter deleted");
        fetchData();
      }
    } catch {
      toast.error("Error deleting charter");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <PlanningNavHeader active="charters" charterView="kanban" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Charters Kanban Board</h1>
          <p className="text-muted-foreground text-sm">
            Drag and drop charters across lifecycle stages to advance organizational initiatives.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/addons/planning/charters/new">
            <Plus className="mr-1.5 h-4 w-4" /> Create Charter
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageCharters = charters.filter((c) => c.stageId === stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="bg-muted/30 border rounded-xl p-3 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color || "#3b82f6" }}
                    />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      {stage.name}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-xs h-5 px-1.5 font-mono">
                    {stageCharters.length}
                  </Badge>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1">
                  {stageCharters.length === 0 ? (
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center text-muted-foreground text-xs h-32 flex items-center justify-center">
                      Drop charters here
                    </div>
                  ) : (
                    stageCharters.map((c) => (
                      <Card
                        key={c.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, c.id)}
                        onClick={() => navigate({ to: `/addons/planning/charters/${c.id}` })}
                        className="p-3.5 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border bg-card relative group space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="font-semibold text-xs leading-snug line-clamp-2">
                            {c.name}
                          </div>
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        </div>

                        {c.challengeName && (
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium line-clamp-1">
                            {c.challengeName}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5">
                              <Users className="h-3 w-3" />
                              {c.members?.length || 0}
                            </span>
                            <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                              <Star className="h-3 w-3 fill-amber-500" />
                              {c.ratingAvg > 0 ? c.ratingAvg : "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link to="/addons/planning/charters/$id/edit" params={{ id: c.id }}>
                                <Edit className="h-3 w-3" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleDelete(c.id, c.name, e)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
