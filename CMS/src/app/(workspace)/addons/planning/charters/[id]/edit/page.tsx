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
import { ArrowLeft, Save, Plus, Trash2, FileText, UserPlus, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/charters/$id/edit"
)({
  component: EditCharterPage,
});

export default function EditCharterPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    challengeId: "",
    statusId: "",
    stageId: "",
    description: "",
    organisationalEffects: "",
    goalDescription: "",
    notes: "",
    budgetAmount: 0,
    members: [] as { userId: string; userName: string; roleId: string; roleName: string }[],
    attachments: [] as { id: string; name: string; url: string }[],
  });

  const [memberInput, setMemberInput] = useState({ userName: "", roleName: "Contributor" });
  const [attachmentInput, setAttachmentInput] = useState({ name: "", url: "" });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [charRes, chalRes, stgRes, staRes] = await Promise.all([
        fetch(`/api/v1/addons/planning/models/${id}`, { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/planning/challenges", { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/planning/stages", { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/planning/statuses", { headers: getAuthHeaders() }),
      ]);

      if (chalRes.ok) {
        const json = await chalRes.json();
        setChallenges(json.data || (Array.isArray(json) ? json : []));
      }
      if (stgRes.ok) {
        const json = await stgRes.json();
        setStages(json.data || (Array.isArray(json) ? json : []));
      }
      if (staRes.ok) {
        const json = await staRes.json();
        setStatuses(json.data || (Array.isArray(json) ? json : []));
      }

      if (charRes.ok) {
        const json = await charRes.json();
        const c = json.data || json;
        setForm({
          name: c.name || "",
          challengeId: c.challengeId || "",
          statusId: c.statusId || "",
          stageId: c.stageId || "",
          description: c.description || "",
          organisationalEffects: c.organisationalEffects || "",
          goalDescription: c.goalDescription || "",
          notes: c.notes || "",
          budgetAmount: c.budgetAmount || 0,
          members: c.members || [],
          attachments: c.attachments || [],
        });
      } else {
        toast.error("Charter not found");
        navigate({ to: "/addons/planning/charters" });
      }
    } catch {
      toast.error("Failed to load charter details");
    } finally {
      setLoading(false);
    }
  };

  const addMember = () => {
    if (!memberInput.userName.trim()) return;
    setForm((p) => ({
      ...p,
      members: [
        ...p.members,
        {
          userId: `u_${Date.now()}`,
          userName: memberInput.userName.trim(),
          roleId: `r_${Date.now()}`,
          roleName: memberInput.roleName,
        },
      ],
    }));
    setMemberInput({ userName: "", roleName: "Contributor" });
  };

  const removeMember = (idx: number) => {
    setForm((p) => ({
      ...p,
      members: p.members.filter((_, i) => i !== idx),
    }));
  };

  const addAttachment = () => {
    if (!attachmentInput.name.trim() || !attachmentInput.url.trim()) return;
    setForm((p) => ({
      ...p,
      attachments: [
        ...p.attachments,
        {
          id: `att_${Date.now()}`,
          name: attachmentInput.name.trim(),
          url: attachmentInput.url.trim(),
        },
      ],
    }));
    setAttachmentInput({ name: "", url: "" });
  };

  const removeAttachment = (idx: number) => {
    setForm((p) => ({
      ...p,
      attachments: p.attachments.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Charter name is required");

    try {
      setSaving(true);
      const res = await fetch(`/api/v1/addons/planning/models/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...form,
          challengeId: form.challengeId || null,
        }),
      });

      if (res.ok) {
        toast.success("Charter updated successfully!");
        navigate({ to: `/addons/planning/charters/${id}` });
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update charter");
      }
    } catch {
      toast.error("Network error updating charter");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <PlanningNavHeader active="charters" />
        <Skeleton className="h-8 w-48 mb-4" />
        <Card className="p-8 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <PlanningNavHeader active="charters" />

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: `/addons/planning/charters/${id}` })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Edit Strategic Charter
          </h1>
          <p className="text-xs text-muted-foreground">Modify parameters, narrative, and team membership.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Charter Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Charter Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Parent Challenge</Label>
                <Select
                  value={form.challengeId}
                  onValueChange={(val) => setForm((p) => ({ ...p, challengeId: val === "none" ? "" : val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select challenge..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Standalone Initiative)</SelectItem>
                    {challenges.map((c) => {
                      const isEnded = new Date(c.endAt).getTime() < Date.now();
                      return (
                        <SelectItem key={c.id} value={c.id} disabled={isEnded}>
                          {c.name} {isEnded ? "(Ended)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select
                  value={form.stageId}
                  onValueChange={(val) => setForm((p) => ({ ...p, stageId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.statusId}
                  onValueChange={(val) => setForm((p) => ({ ...p, statusId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Budget Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.budgetAmount || ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, budgetAmount: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Organisational Effects</Label>
              <Textarea
                rows={3}
                value={form.organisationalEffects}
                onChange={(e) => setForm((p) => ({ ...p, organisationalEffects: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Goal Description</Label>
              <Textarea
                rows={3}
                value={form.goalDescription}
                onChange={(e) => setForm((p) => ({ ...p, goalDescription: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
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
              onClick={() => navigate({ to: `/addons/planning/charters/${id}` })}
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
