'use client';
import React, { useEffect, useState } from "react";
import {  createFileRoute, useNavigate, Link  } from "@/src/lib/router-compat";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Calendar, Target, Plus, FileText, Clock, AlertTriangle, Star } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/challenges/$id/"
)({
  component: ChallengeDetailPage,
});

export default function ChallengeDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallenge();
  }, [id]);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      const [chalRes, modRes] = await Promise.all([
        fetch(`/api/v1/addons/planning/challenges/${id}`, {
          headers: getAuthHeaders(),
        }),
        fetch(`/api/v1/addons/planning/models?challengeId=${id}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (chalRes.ok) {
        const json = await chalRes.json();
        setChallenge(json.data || json);
      } else {
        toast.error("Challenge not found");
        navigate({ to: "/addons/planning/challenges" });
      }

      if (modRes.ok) {
        const modJson = await modRes.json();
        setModels(modJson.data || (Array.isArray(modJson) ? modJson : []));
      }
    } catch {
      toast.error("Failed to load challenge details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl space-y-6">
        <PlanningNavHeader active="challenges" />
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Card className="p-8 space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    );
  }

  const isExpired = challenge ? new Date(challenge.endAt).getTime() < Date.now() : false;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <PlanningNavHeader active="challenges" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate({ to: "/addons/planning/challenges" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-500" />
                {challenge?.name}
              </h1>
              <Badge variant="outline">{challenge?.categoryName || "General"}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                End Date: {challenge?.endAt ? format(new Date(challenge.endAt), "MMMM d, yyyy") : ""}
              </span>
              <span>•</span>
              <span className="capitalize">Position: {challenge?.position?.replace("_", " ")}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/addons/planning/challenges/$id/edit" params={{ id: challenge?.id }}>
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Challenge
            </Link>
          </Button>
          <Button size="sm" asChild disabled={isExpired}>
            <Link to="/addons/planning/charters/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Charter
            </Link>
          </Button>
        </div>
      </div>

      {isExpired && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            This challenge deadline has passed. Per planning governance rules, new charters cannot be created under ended challenges.
          </span>
        </div>
      )}

      {/* Main Challenge Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Strategic Explanation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <p className="leading-relaxed bg-muted/30 p-3 rounded-lg font-sans">
            {challenge?.explanation || "No strategic explanation provided."}
          </p>

          {challenge?.notes && (
            <div>
              <span className="font-semibold text-muted-foreground block mb-1">Internal Notes</span>
              <p className="bg-muted/20 p-2.5 rounded border text-[11px] font-mono">{challenge.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Charters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Initiative Charters ({models.length})
          </h2>
          {!isExpired && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/addons/planning/charters/new">
                <Plus className="mr-1 h-3 w-3" /> New Charter
              </Link>
            </Button>
          )}
        </div>

        {models.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No charters linked to this challenge yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map((m) => (
              <Card
                key={m.id}
                className="hover:shadow-sm transition-shadow cursor-pointer p-4 space-y-3"
                onClick={() => navigate({ to: `/addons/planning/charters/${m.id}` })}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm line-clamp-1">{m.name}</div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {m.stageName}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {m.description || "No description provided."}
                </p>
                <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">Rating: {m.ratingAvg > 0 ? (<><Star className="size-3 text-amber-500 fill-amber-500 shrink-0" /> {m.ratingAvg} ({m.ratingCount})</>) : "Unrated"}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {m.statusName}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
