'use client';
import React, { useEffect, useState } from "react";
import {  createFileRoute, useNavigate  } from "@/src/lib/router-compat";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/challenges/$id/edit"
)({
  component: EditChallengePage,
});

export default function EditChallengePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    endAt: "",
    position: "ongoing",
    explanation: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [chalRes, catRes] = await Promise.all([
        fetch(`/api/v1/addons/planning/challenges/${id}`, { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/planning/categories", { headers: getAuthHeaders() }),
      ]);

      if (catRes.ok) {
        const catJson = await catRes.json();
        setCategories(catJson.data || (Array.isArray(catJson) ? catJson : []));
      }

      if (chalRes.ok) {
        const chalJson = await chalRes.json();
        const c = chalJson.data || chalJson;
        setForm({
          name: c.name || "",
          categoryId: c.categoryId || "",
          endAt: c.endAt ? c.endAt.substring(0, 10) : "",
          position: c.position || "ongoing",
          explanation: c.explanation || "",
          notes: c.notes || "",
        });
      } else {
        toast.error("Challenge not found");
        navigate({ to: "/addons/planning/challenges" });
      }
    } catch {
      toast.error("Failed to load challenge details");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Challenge name is required");
    if (!form.categoryId) return toast.error("Please select a category");
    if (!form.endAt) return toast.error("Target end date is required");

    try {
      setSaving(true);
      const res = await fetch(`/api/v1/addons/planning/challenges/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success("Challenge updated successfully!");
        navigate({ to: `/addons/planning/challenges/${id}` });
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update challenge");
      }
    } catch {
      toast.error("Network error updating challenge");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <PlanningNavHeader active="challenges" />
        <Skeleton className="h-8 w-48 mb-4" />
        <Card className="p-8 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <PlanningNavHeader active="challenges" />

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: `/addons/planning/challenges/${id}` })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            Edit Strategic Challenge
          </h1>
          <p className="text-xs text-muted-foreground">
            Update deadlines, category classification, or strategic scope.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Challenge Parameters</CardTitle>
            <CardDescription>Adjust attributes and review status progression</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Challenge Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(val) => setForm((p) => ({ ...p, categoryId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Target End Date *</Label>
                <Input
                  type="date"
                  value={form.endAt}
                  onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Position</Label>
                <Select
                  value={form.position}
                  onValueChange={(val) => setForm((p) => ({ ...p, position: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="finished">Finished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label>Strategic Explanation</Label>
              <Textarea
                rows={4}
                value={form.explanation}
                onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Internal Team Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: `/addons/planning/challenges/${id}` })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
