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
import { ArrowLeft, Save, Sparkles, Plus, Trash2, FileText, UserPlus, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/charters/new"
)({
  component: CreateCharterPage,
});

export default function CreateCharterPage() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // AI Modal State
  const [aiModal, setAiModal] = useState<{
    open: boolean;
    fieldKey: "charter_description" | "organisational_effects" | "goal_description";
    fieldLabel: string;
  }>({
    open: false,
    fieldKey: "charter_description",
    fieldLabel: "Description",
  });

  const [form, setForm] = useState({
    name: "",
    challengeId: "",
    statusId: "",
    stageId: "",
    thumbnailMediaId: "",
    videoMediaId: "",
    description: "",
    organisationalEffects: "",
    goalDescription: "",
    notes: "",
    budgetAmount: 0,
    members: [] as { userId: string; userName: string; roleId: string; roleName: string }[],
    attachments: [] as { id: string; name: string; url: string }[],
  });

  // Member and Attachment temporary input states
  const [memberInput, setMemberInput] = useState({ userName: "", roleName: "Contributor" });
  const [attachmentInput, setAttachmentInput] = useState({ name: "", url: "" });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [chalRes, stgRes, staRes] = await Promise.all([
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
        const list = json.data || (Array.isArray(json) ? json : []);
        setStages(list);
        if (list?.length > 0) setForm((p) => ({ ...p, stageId: list[0].id }));
      }
      if (staRes.ok) {
        const json = await staRes.json();
        const list = json.data || (Array.isArray(json) ? json : []);
        setStatuses(list);
        if (list?.length > 0) setForm((p) => ({ ...p, statusId: list[0].id }));
      }
    } catch {
      toast.error("Failed to load charter options");
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
      setLoading(true);
      const res = await fetch("/api/v1/addons/planning/models", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...form,
          type: "charter",
          challengeId: form.challengeId || null,
        }),
      });

      if (res.ok) {
        toast.success("Strategic charter created successfully!");
        navigate({ to: "/addons/planning/charters" });
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to create charter");
      }
    } catch {
      toast.error("Network error creating charter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <PlanningNavHeader active="charters" />

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate({ to: "/addons/planning/charters" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Create Initiative Charter
          </h1>
          <p className="text-xs text-muted-foreground">
            Establish scope, objectives, stakeholders, and team members for strategic execution.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Charter Core Attributes</CardTitle>
            <CardDescription>Primary identification and challenge alignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Charter Name *</Label>
                <Input
                  placeholder="e.g. ERP Migration & Modernization Phase 1"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Parent Challenge</Label>
                <Select
                  value={form.challengeId}
                  onValueChange={(val) => setForm((p) => ({ ...p, challengeId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select challenge (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Standalone Initiative)</SelectItem>
                    {challenges.map((c) => {
                      const isEnded = new Date(c.endAt).getTime() < Date.now();
                      return (
                        <SelectItem key={c.id} value={c.id} disabled={isEnded}>
                          {c.name} {isEnded ? "(Ended - Unavailable)" : ""}
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
                  placeholder="0"
                  value={form.budgetAmount || ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, budgetAmount: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Narrative & AI Generated Sections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Strategic Narrative</CardTitle>
            <CardDescription>Synthesize scope, organizational impact, and targets with AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Charter Description</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary gap-1"
                  onClick={() =>
                    setAiModal({
                      open: true,
                      fieldKey: "charter_description",
                      fieldLabel: "Charter Description",
                    })
                  }
                >
                  <Sparkles className="h-3 w-3" /> Generate with AI
                </Button>
              </div>
              <Textarea
                rows={3}
                placeholder="High-level project scope and executive summary..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Organisational Effects */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Organisational Effects</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary gap-1"
                  onClick={() =>
                    setAiModal({
                      open: true,
                      fieldKey: "organisational_effects",
                      fieldLabel: "Organisational Effects",
                    })
                  }
                >
                  <Sparkles className="h-3 w-3" /> Generate with AI
                </Button>
              </div>
              <Textarea
                rows={3}
                placeholder="Expected impact on departments, processes, workforce, and operational cadence..."
                value={form.organisationalEffects}
                onChange={(e) => setForm((p) => ({ ...p, organisationalEffects: e.target.value }))}
              />
            </div>

            {/* Goal Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Goal Description</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary gap-1"
                  onClick={() =>
                    setAiModal({
                      open: true,
                      fieldKey: "goal_description",
                      fieldLabel: "Goal Description",
                    })
                  }
                >
                  <Sparkles className="h-3 w-3" /> Generate with AI
                </Button>
              </div>
              <Textarea
                rows={3}
                placeholder="Specific qualitative and quantitative targets to be achieved..."
                value={form.goalDescription}
                onChange={(e) => setForm((p) => ({ ...p, goalDescription: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Internal Notes</Label>
              <Textarea
                rows={2}
                placeholder="Internal team notes or meeting log..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stakeholder Members & Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Members & Attachments</CardTitle>
            <CardDescription>Assign collaborators and link relevant media or project specs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-xs">
            {/* Members */}
            <div className="space-y-3">
              <Label className="font-semibold flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-primary" /> Team Members
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Stakeholder Name or Email"
                  value={memberInput.userName}
                  onChange={(e) => setMemberInput((p) => ({ ...p, userName: e.target.value }))}
                />
                <Input
                  placeholder="Role (e.g. Lead, Sponsor, Tech Architect)"
                  value={memberInput.roleName}
                  onChange={(e) => setMemberInput((p) => ({ ...p, roleName: e.target.value }))}
                  className="w-56"
                />
                <Button type="button" size="sm" variant="outline" onClick={addMember}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {form.members.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {form.members.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded border bg-muted/20 text-xs"
                    >
                      <div>
                        <span className="font-semibold">{m.userName}</span>
                        <span className="text-muted-foreground ml-2">({m.roleName})</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeMember(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="space-y-3 pt-3 border-t">
              <Label className="font-semibold flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-indigo-500" /> Supporting Document Links
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Document Title"
                  value={attachmentInput.name}
                  onChange={(e) => setAttachmentInput((p) => ({ ...p, name: e.target.value }))}
                />
                <Input
                  placeholder="URL (e.g. https://...)"
                  value={attachmentInput.url}
                  onChange={(e) => setAttachmentInput((p) => ({ ...p, url: e.target.value }))}
                />
                <Button type="button" size="sm" variant="outline" onClick={addAttachment}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {form.attachments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {form.attachments.map((a, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded border bg-muted/20 text-xs"
                    >
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {a.name}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeAttachment(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/addons/planning/charters" })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-1.5 h-4 w-4" />
              {loading ? "Creating..." : "Create Charter"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <GenerateWithAiModal
        open={aiModal.open}
        onOpenChange={(open: boolean) => setAiModal((p) => ({ ...p, open }))}
        moduleSlug="planning"
        fieldKey={aiModal.fieldKey}
        fieldLabel={aiModal.fieldLabel}
        initialContext={form.name ? `Charter: ${form.name}` : ""}
        onSelectResult={(text) => {
          if (aiModal.fieldKey === "charter_description") {
            setForm((p) => ({ ...p, description: text }));
          } else if (aiModal.fieldKey === "organisational_effects") {
            setForm((p) => ({ ...p, organisationalEffects: text }));
          } else if (aiModal.fieldKey === "goal_description") {
            setForm((p) => ({ ...p, goalDescription: text }));
          }
        }}
      />
    </div>
  );
}
