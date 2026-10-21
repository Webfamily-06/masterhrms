'use client';
import React, { useEffect, useState } from "react";
import {  createFileRoute, useNavigate, Link  } from "@/src/lib/router-compat";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Edit,
  Save,
  Star,
  Users,
  Paperclip,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Target,
  FileText,
  DollarSign,
  Send,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/charters/$id/"
)({
  component: CharterDetailPage,
});

export default function CharterDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [charter, setCharter] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Section editing states
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionText, setSectionText] = useState("");
  const [savingSection, setSavingSection] = useState(false);

  // Collapsible toggle states
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    general: false,
    description: false,
    effects: false,
    goals: false,
    notes: false,
    attachments: false,
    comments: false,
  });

  // Comment input state
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Star rating
  const [userRating, setUserRating] = useState(0);

  const fetchCharter = async () => {
    try {
      setLoading(true);
      const [charRes, comRes] = await Promise.all([
        fetch(`/api/v1/addons/planning/models/${id}`, { headers: getAuthHeaders() }),
        fetch(`/api/v1/addons/planning/models/${id}/comments`, { headers: getAuthHeaders() }),
      ]);

      if (charRes.ok) {
        const json = await charRes.json();
        setCharter(json.data || json);
      } else {
        toast.error("Charter not found");
        navigate({ to: "/addons/planning/charters" });
      }

      if (comRes.ok) {
        const comJson = await comRes.json();
        setComments(comJson.data || (Array.isArray(comJson) ? comJson : []));
      }
    } catch {
      toast.error("Failed to load charter");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharter();
  }, [id]);

  const toggleSection = (section: string) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const startEditSection = (section: string, currentText: string) => {
    setEditingSection(section);
    setSectionText(currentText || "");
  };

  const saveSection = async (sectionKey: string) => {
    try {
      setSavingSection(true);
      const payload: any = {};
      if (sectionKey === "description") payload.description = sectionText;
      if (sectionKey === "effects") payload.organisationalEffects = sectionText;
      if (sectionKey === "goals") payload.goalDescription = sectionText;
      if (sectionKey === "notes") payload.notes = sectionText;

      const res = await fetch(`/api/v1/addons/planning/models/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Section updated successfully");
        setEditingSection(null);
        fetchCharter();
      } else {
        toast.error("Failed to update section");
      }
    } catch {
      toast.error("Error saving section");
    } finally {
      setSavingSection(false);
    }
  };

  const handleRate = async (stars: number) => {
    try {
      setUserRating(stars);
      const res = await fetch(`/api/v1/addons/planning/models/${id}/rating`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ rating: stars }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`Rated ${stars} stars!`);
        setCharter((prev: any) => ({
          ...prev,
          ratingAvg: json.data?.ratingAvg,
          ratingCount: json.data?.ratingCount,
        }));
      }
    } catch {
      toast.error("Failed to submit rating");
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setPostingComment(true);
      const res = await fetch(`/api/v1/addons/planning/models/${id}/comments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ body: commentText.trim() }),
      });

      if (res.ok) {
        toast.success("Comment posted");
        setCommentText("");
        const comRes = await fetch(`/api/v1/addons/planning/models/${id}/comments`, {
          headers: getAuthHeaders(),
        });
        if (comRes.ok) {
          const comJson = await comRes.json();
          setComments(comJson.data || (Array.isArray(comJson) ? comJson : []));
        }
      }
    } catch {
      toast.error("Error posting comment");
    } finally {
      setPostingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl space-y-6">
        <PlanningNavHeader active="charters" />
        <Skeleton className="h-8 w-48 mb-4" />
        <Card className="p-8 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <PlanningNavHeader active="charters" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate({ to: "/addons/planning/charters" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: charter?.stageColor || "#3b82f6" }}
              />
              <h1 className="text-xl font-bold">{charter?.name}</h1>
              <Badge variant="secondary" className="text-xs">
                {charter?.stageName}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {charter?.statusName}
              </Badge>
            </div>
            {charter?.challengeName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Target className="h-3.5 w-3.5 text-indigo-500" />
                <span>Challenge: {charter.challengeName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Rating stars */}
          <div className="flex items-center gap-1 bg-muted/40 px-2.5 py-1 rounded-lg border">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                className="text-amber-400 hover:scale-125 transition-transform"
                onClick={() => handleRate(s)}
              >
                <Star
                  className={`h-4 w-4 ${
                    (userRating >= s || (charter?.ratingAvg >= s && !userRating))
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
            <span className="text-xs font-semibold ml-1.5">
              {charter?.ratingAvg > 0 ? `${charter.ratingAvg} (${charter.ratingCount})` : "Rate"}
            </span>
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link to="/addons/planning/charters/$id/edit" params={{ id: charter?.id }}>
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Full Charter
            </Link>
          </Button>
        </div>
      </div>

      {/* SECTION 1: GENERAL (Expanded) */}
      <Card>
        <CardHeader
          className="pb-3 flex flex-row items-center justify-between cursor-pointer border-b"
          onClick={() => toggleSection("general")}
        >
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> General Overview
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {collapsed.general ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {!collapsed.general && (
          <CardContent className="pt-4 text-xs space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-muted-foreground block mb-0.5">Stage</span>
                <Badge variant="secondary">{charter?.stageName}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Status</span>
                <Badge variant="outline">{charter?.statusName}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Allocated Budget</span>
                <span className="font-semibold text-emerald-600">
                  {charter?.budgetAmount ? `$${charter.budgetAmount.toLocaleString()}` : "Not budgeted"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Created Date</span>
                <span>{charter?.createdAt ? format(new Date(charter.createdAt), "MMM d, yyyy") : ""}</span>
              </div>
            </div>

            {charter?.members?.length > 0 && (
              <div className="pt-2 border-t">
                <span className="font-semibold text-muted-foreground block mb-1.5">Assigned Members</span>
                <div className="flex flex-wrap gap-2">
                  {charter.members.map((m: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs py-1">
                      <Users className="h-3 w-3 mr-1 text-primary" />
                      {m.userName} ({m.roleName})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* SECTION 2: DESCRIPTION (+Edit) */}
      <Card>
        <CardHeader
          className="pb-3 flex flex-row items-center justify-between cursor-pointer border-b"
          onClick={() => toggleSection("description")}
        >
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">Description</CardTitle>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {editingSection !== "description" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => startEditSection("description", charter?.description)}
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleSection("description")}>
              {collapsed.description ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {!collapsed.description && (
          <CardContent className="pt-4 text-xs">
            {editingSection === "description" ? (
              <div className="space-y-3">
                <Textarea
                  rows={4}
                  value={sectionText}
                  onChange={(e) => setSectionText(e.target.value)}
                  className="text-xs"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingSection(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => saveSection("description")} disabled={savingSection}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="leading-relaxed bg-muted/20 p-3 rounded font-sans">
                {charter?.description || "No description provided."}
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* SECTION 3: ORGANISATIONAL EFFECTS (+Edit) */}
      <Card>
        <CardHeader
          className="pb-3 flex flex-row items-center justify-between cursor-pointer border-b"
          onClick={() => toggleSection("effects")}
        >
          <CardTitle className="text-sm font-semibold">Organisational Effects</CardTitle>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {editingSection !== "effects" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => startEditSection("effects", charter?.organisationalEffects)}
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleSection("effects")}>
              {collapsed.effects ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {!collapsed.effects && (
          <CardContent className="pt-4 text-xs">
            {editingSection === "effects" ? (
              <div className="space-y-3">
                <Textarea
                  rows={4}
                  value={sectionText}
                  onChange={(e) => setSectionText(e.target.value)}
                  className="text-xs"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingSection(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => saveSection("effects")} disabled={savingSection}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="leading-relaxed bg-muted/20 p-3 rounded font-sans">
                {charter?.organisationalEffects || "No organisational effects detailed."}
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* SECTION 4: GOAL DESCRIPTION (+Edit) */}
      <Card>
        <CardHeader
          className="pb-3 flex flex-row items-center justify-between cursor-pointer border-b"
          onClick={() => toggleSection("goals")}
        >
          <CardTitle className="text-sm font-semibold">Goal Description</CardTitle>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {editingSection !== "goals" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => startEditSection("goals", charter?.goalDescription)}
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleSection("goals")}>
              {collapsed.goals ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {!collapsed.goals && (
          <CardContent className="pt-4 text-xs">
            {editingSection === "goals" ? (
              <div className="space-y-3">
                <Textarea
                  rows={4}
                  value={sectionText}
                  onChange={(e) => setSectionText(e.target.value)}
                  className="text-xs"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingSection(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => saveSection("goals")} disabled={savingSection}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="leading-relaxed bg-muted/20 p-3 rounded font-sans">
                {charter?.goalDescription || "No goal description provided."}
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* SECTION 5: ATTACHMENTS */}
      <Card>
        <CardHeader
          className="pb-3 flex flex-row items-center justify-between cursor-pointer border-b"
          onClick={() => toggleSection("attachments")}
        >
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-indigo-500" /> Attachments & Media (
            {charter?.attachments?.length || 0})
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {collapsed.attachments ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {!collapsed.attachments && (
          <CardContent className="pt-4 text-xs">
            {(!charter?.attachments || charter.attachments.length === 0) ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No attachments added.</p>
            ) : (
              <div className="divide-y border rounded-lg">
                {charter.attachments.map((att: any, idx: number) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-muted/30">
                    <span className="font-semibold">{att.name}</span>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-xs"
                    >
                      Open Link ↗
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* SECTION 6: REALTIME COMMENTS */}
      <Card>
        <CardHeader
          className="pb-3 flex flex-row items-center justify-between cursor-pointer border-b"
          onClick={() => toggleSection("comments")}
        >
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Discussion & Updates ({comments.length})
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {collapsed.comments ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {!collapsed.comments && (
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={handlePostComment} className="flex items-center gap-2">
              <Input
                placeholder="Post a strategic update or mention a teammate..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-xs"
              />
              <Button type="submit" size="sm" disabled={postingComment || !commentText.trim()}>
                <Send className="h-3.5 w-3.5 mr-1" /> Post
              </Button>
            </form>

            <div className="space-y-3 pt-2">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No discussion yet. Start the conversation!
                </p>
              ) : (
                comments.map((com) => (
                  <div key={com.id} className="p-3 bg-muted/20 border rounded-lg space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground">{com.userName}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {com.createdAt ? format(new Date(com.createdAt), "MMM d, h:mm a") : ""}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">{com.body}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
