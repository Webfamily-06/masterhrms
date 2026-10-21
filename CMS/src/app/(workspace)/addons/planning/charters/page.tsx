'use client';
import React, { useEffect, useState } from "react";
import {  createFileRoute, Link, useNavigate  } from "@/src/lib/router-compat";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Eye, Edit, Trash2, FileText, Star, Users, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/charters/"
)({
  component: ChartersListPage,
});

export default function ChartersListPage() {
  const navigate = useNavigate();
  const [charters, setCharters] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (stageFilter !== "all") q.set("stageId", stageFilter);
      if (statusFilter !== "all") q.set("statusId", statusFilter);

      const [charRes, stgRes, staRes] = await Promise.all([
        fetch(`/api/v1/addons/planning/models?type=charter&${q.toString()}`, {
          headers: getAuthHeaders(),
        }),
        fetch("/api/v1/addons/planning/stages", { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/planning/statuses", { headers: getAuthHeaders() }),
      ]);

      if (charRes.ok) {
        const json = await charRes.json();
        setCharters(json.data || (Array.isArray(json) ? json : []));
      }
      if (stgRes.ok) {
        const stgJson = await stgRes.json();
        setStages(stgJson.data || (Array.isArray(stgJson) ? stgJson : []));
      }
      if (staRes.ok) {
        const staJson = await staRes.json();
        setStatuses(staJson.data || (Array.isArray(staJson) ? staJson : []));
      }
    } catch {
      toast.error("Failed to load charters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, stageFilter, statusFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete charter "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/addons/planning/models/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Charter deleted");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to delete charter");
      }
    } catch {
      toast.error("Error deleting charter");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <PlanningNavHeader active="charters" charterView="list" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Initiative Charters</h1>
          <p className="text-muted-foreground text-sm">
            Operational project plans and strategic charters linked to organizational challenges.
          </p>
        </div>
        <Button asChild>
          <Link to="/addons/planning/charters/new">
            <Plus className="mr-1.5 h-4 w-4" /> Create Charter
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search charters..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : charters.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-base mb-1">No charters found</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Draft a new strategic charter linked to a challenge.
              </p>
              <Button asChild size="sm">
                <Link to="/addons/planning/charters/new">Create Charter</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Charter Name</TableHead>
                  <TableHead>Challenge</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charters.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate({ to: `/addons/planning/charters/${c.id}` })}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.stageColor || "#3b82f6" }}
                        />
                        <span className="font-semibold">{c.name}</span>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 ml-4.5">{c.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.challengeName || "Standalone"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {c.stageName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.statusName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{c.members?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                        <Star className="h-3.5 w-3.5 fill-amber-500" />
                        <span>{c.ratingAvg > 0 ? c.ratingAvg : "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to="/addons/planning/charters/$id" params={{ id: c.id }}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to="/addons/planning/charters/$id/edit" params={{ id: c.id }}>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
