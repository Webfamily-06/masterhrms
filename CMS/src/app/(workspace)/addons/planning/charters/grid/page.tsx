'use client';
import React, { useEffect, useState } from "react";
import {  createFileRoute, Link, useNavigate  } from "@/src/lib/router-compat";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Eye, Edit, Trash2, FileText, Star, Users, Target } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/charters/grid"
)({
  component: ChartersGridPage,
});

export default function ChartersGridPage() {
  const navigate = useNavigate();
  const [charters, setCharters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams();
      if (search) q.set("search", search);

      const res = await fetch(`/api/v1/addons/planning/models?type=charter&${q.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setCharters(json.data || (Array.isArray(json) ? json : []));
      }
    } catch {
      toast.error("Failed to load charters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

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
      <PlanningNavHeader active="charters" charterView="grid" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Charters Grid</h1>
          <p className="text-muted-foreground text-sm">
            Card-based portfolio overview with thumbnail, rating, stage, and member counts.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search charters..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button asChild size="sm">
            <Link to="/addons/planning/charters/new">
              <Plus className="mr-1.5 h-4 w-4" /> Create
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-20 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ))}
        </div>
      ) : charters.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-base mb-1">No charters found</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Start by creating a strategic charter for your initiative.
          </p>
          <Button asChild size="sm">
            <Link to="/addons/planning/charters/new">Create Charter</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {charters.map((c) => (
            <Card
              key={c.id}
              className="flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer border"
              onClick={() => navigate({ to: `/addons/planning/charters/${c.id}` })}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.stageColor || "#3b82f6" }}
                    />
                    <CardTitle className="text-base font-bold line-clamp-1">{c.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {c.stageName}
                  </Badge>
                </div>
                {c.challengeName && (
                  <CardDescription className="flex items-center gap-1 text-xs mt-1">
                    <Target className="h-3 w-3 text-indigo-500" />
                    <span className="line-clamp-1">{c.challengeName}</span>
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="pb-4">
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed bg-muted/20 p-2.5 rounded-md min-h-[58px]">
                  {c.description || "No description provided for this charter."}
                </p>

                <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t">
                  <Badge variant="outline" className="text-[10px]">
                    {c.statusName}
                  </Badge>
                  <div className="flex items-center gap-3 text-muted-foreground text-xs">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {c.members?.length || 0}
                    </span>
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      {c.ratingAvg > 0 ? c.ratingAvg : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0 flex items-center justify-between border-t p-3.5 mt-auto">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/addons/planning/charters/$id" params={{ id: c.id }}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                  </Link>
                </Button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                    <Link to="/addons/planning/charters/$id/edit" params={{ id: c.id }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDelete(c.id, c.name, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
