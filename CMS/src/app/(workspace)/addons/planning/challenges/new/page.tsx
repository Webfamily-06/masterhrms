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
import { GenerateWithAiModal } from "@/components/ai/generate-with-ai-modal";
import { ArrowLeft, Save, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/challenges/new"
)({
  component: CreateChallengePage,
});

export default function CreateChallengePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    endAt: "",
    position: "ongoing",
    explanation: "",
    notes: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/v1/addons/planning/categories", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || (Array.isArray(json) ? json : []);
        setCategories(list);
        if (list?.length > 0) {
          setForm((prev) => ({ ...prev, categoryId: list[0].id }));
        }
      }
    } catch {
      toast.error("Failed to load categories");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Challenge name is required");
    if (!form.categoryId) return toast.error("Please select a category");
    if (!form.endAt) return toast.error("Target end date is required");

    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/planning/challenges", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success("Strategic challenge created successfully!");
        navigate({ to: "/addons/planning/challenges" });
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to create challenge");
      }
    } catch {
      toast.error("Network error creating challenge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <PlanningNavHeader active="challenges" />

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate({ to: "/addons/planning/challenges" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            Create Strategic Challenge
          </h1>
          <p className="text-xs text-muted-foreground">
            Formulate an overarching objective with clear target deadlines and measurable impact.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Challenge Information</CardTitle>
            <CardDescription>
              All charters will align to this challenge until its completion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Challenge Name *</Label>
                <Input
                  placeholder="e.g. Expand APAC Enterprise Market Share by 30%"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Setup Category *</Label>
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
                <Label>Target End Date / Time *</Label>
                <Input
                  type="date"
                  value={form.endAt}
                  onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Initial Position</Label>
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
              <div className="flex items-center justify-between">
                <Label>Strategic Explanation / Problem Statement</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary gap-1"
                  onClick={() => setIsAiModalOpen(true)}
                >
                  <Sparkles className="h-3 w-3" /> Generate with AI
                </Button>
              </div>
              <Textarea
                rows={4}
                placeholder="Elaborate on market dynamics, strategic rationale, and KPIs..."
                value={form.explanation}
                onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Internal Team Notes</Label>
              <Textarea
                rows={2}
                placeholder="Optional notes, cross-functional dependencies, or resource links..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/addons/planning/challenges" })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-1.5 h-4 w-4" />
              {loading ? "Creating..." : "Create Challenge"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <GenerateWithAiModal
        open={isAiModalOpen}
        onOpenChange={setIsAiModalOpen}
        moduleSlug="planning"
        fieldKey="challenge_explanation"
        fieldLabel="Challenge Explanation"
        initialContext={form.name ? `Strategic Challenge: ${form.name}` : ""}
        onSelectResult={(generatedText) => {
          setForm((p) => ({ ...p, explanation: generatedText }));
        }}
      />
    </div>
  );
}
