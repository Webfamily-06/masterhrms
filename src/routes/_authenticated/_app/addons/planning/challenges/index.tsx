import React, { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Eye, Edit, Trash2, Target, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/challenges/"
)({
  component: ChallengesListPage,
});

export default function ChallengesListPage() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (positionFilter !== "all") queryParams.set("position", positionFilter);
      if (categoryFilter !== "all") queryParams.set("categoryId", categoryFilter);

      const [chalRes, catRes] = await Promise.all([
        fetch(`/api/v1/addons/planning/challenges?${queryParams.toString()}`, {
          headers: getAuthHeaders(),
        }),
        fetch("/api/v1/addons/planning/categories", {
          headers: getAuthHeaders(),
        }),
      ]);

      if (chalRes.ok) {
        const json = await chalRes.json();
        setChallenges(json.data || (Array.isArray(json) ? json : []));
      }
      if (catRes.ok) {
        const catJson = await catRes.json();
        setCategories(catJson.data || (Array.isArray(catJson) ? catJson : []));
      }
    } catch {
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, positionFilter, categoryFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete challenge "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/v1/addons/planning/challenges/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Challenge deleted");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to delete challenge");
      }
    } catch {
      toast.error("Error deleting challenge");
    }
  };

  const getPositionBadge = (pos: string) => {
    switch (pos) {
      case "ongoing":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Ongoing</Badge>;
      case "on_hold":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">On Hold</Badge>;
      case "finished":
        return <Badge variant="secondary">Finished</Badge>;
      default:
        return <Badge variant="outline">{pos}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <PlanningNavHeader active="challenges" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Strategic Challenges</h1>
          <p className="text-muted-foreground text-sm">
            Time-bound objectives and organizational milestones driving initiative charters.
          </p>
        </div>
        <Button asChild>
          <Link to="/addons/planning/challenges/new">
            <Plus className="mr-1.5 h-4 w-4" /> New Challenge
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search challenges..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="finished">Finished</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : challenges.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-base mb-1">No challenges found</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Define measurable strategic challenges to align team charters.
              </p>
              <Button asChild size="sm">
                <Link to="/addons/planning/challenges/new">Create Challenge</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Challenge Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Target End Date</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challenges.map((c) => {
                  const isExpired = new Date(c.endAt).getTime() < Date.now();
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate({ to: `/addons/planning/challenges/${c.id}` })}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-indigo-500 shrink-0" />
                          <span>{c.name}</span>
                        </div>
                        {c.explanation && (
                          <p className="text-xs text-muted-foreground line-clamp-1 ml-6">{c.explanation}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {c.categoryName || "General"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={isExpired ? "text-destructive font-semibold" : ""}>
                            {format(new Date(c.endAt), "MMM d, yyyy")}
                          </span>
                          {isExpired && <span className="text-[10px] text-destructive">(Ended)</span>}
                        </div>
                      </TableCell>
                      <TableCell>{getPositionBadge(c.position)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to="/addons/planning/challenges/$id" params={{ id: c.id }}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to="/addons/planning/challenges/$id/edit" params={{ id: c.id }}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(c.id, c.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
