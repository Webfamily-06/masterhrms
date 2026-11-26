'use client';

import { useState } from "react";
import { Link } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function EmployeeFeedbackPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const currentUserId = profile?.id || "user";

  const [activeTab, setActiveTab] = useState<"community" | "mine">("community");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailItem, setShowDetailItem] = useState<any | null>(null);

  // Form State
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createAnonymous, setCreateAnonymous] = useState(false);

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ["my-feedback-categories"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/suggestion-box/categories");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["my-feedback-suggestions", search, categoryFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
        const res: any = await api.get(`/suggestion-box/suggestions?${params.toString()}`);
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const createSuggestionMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; categoryId: string; isAnonymous: boolean }) => {
      return await api.post("/suggestion-box/suggestions", payload);
    },
    onSuccess: () => {
      toast.success("Thank you! Your idea has been shared with the team.");
      qc.invalidateQueries({ queryKey: ["my-feedback-suggestions"] });
      setShowCreateModal(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateCategory("");
      setCreateAnonymous(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to submit idea.");
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/suggestion-box/suggestions/${id}/vote`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-feedback-suggestions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to register vote.");
    },
  });

  const mySubmissions = suggestions.filter((s: any) => s.submittedById === currentUserId);
  const displayList = activeTab === "mine" ? mySubmissions : suggestions;

  const totalIdeas = suggestions.length;
  const myTotal = mySubmissions.length;
  const acceptedTotal = suggestions.filter((s: any) => s.status === "Accepted" || s.status === "Complete").length;

  return (
    <div className="w-full space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Feedback & Suggestions"
        description="Share ideas to improve workplace culture, propose new features, upvote colleague suggestions, and track management decisions."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-1.5 h-8 font-semibold text-xs"
            >
              <i className="ph ph-lightbulb text-sm" />
              <span>Share an Idea</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Visual Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Community Ideas</span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <i className="ph ph-users-three text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{totalIdeas} Suggestions</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Shared across the organization</p>
            </div>
            <div className="text-[11px] text-primary font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-thumbs-up text-xs" />
              <span>Collaborative Innovation</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">My Submissions</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-lightbulb text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{myTotal} Shared</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Submitted by you</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-clock text-xs" />
              <span>Track Progress</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Approved & Executed</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">{acceptedTotal} Implemented</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Adopted into company practice</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-rocket-launch text-xs" />
              <span>Delivered Value</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed View ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 flex gap-1 w-full sm:w-auto justify-start border border-border/80 rounded-lg">
          <TabsTrigger value="community" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-card">
            <i className="ph ph-users text-primary text-sm" />
            <span>Community Wall ({suggestions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="mine" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-card">
            <i className="ph ph-user text-amber-600 text-sm" />
            <span>My Submitted Ideas ({myTotal})</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
          <div className="relative w-full sm:w-80">
            <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
            <Input
              placeholder="Search ideas or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-xs w-44">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ideas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayList.map((item: any) => {
            const hasVoted = item.votes?.includes(currentUserId);
            const votesCount = item.voteCount || item.votes?.length || 0;

            return (
              <Card
                key={item.id}
                className="border border-border/80 rounded-xl bg-card shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold"
                      style={{
                        borderColor: item.categoryColor ? `${item.categoryColor}40` : undefined,
                        color: item.categoryColor,
                      }}
                    >
                      {item.categoryName || "General"}
                    </Badge>

                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold capitalize",
                        item.status === "Complete" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                        item.status === "Accepted" && "bg-sky-500/10 text-sky-600 border-sky-500/30",
                        item.status === "Under Review" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                        item.status === "New" && "bg-purple-500/10 text-purple-600 border-purple-500/30",
                        item.status === "Rejected" && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                      )}
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <CardTitle
                    className="text-sm font-bold text-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setShowDetailItem(item)}
                  >
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-3">
                    {item.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2">
                  {item.adminResponse && (
                    <div className="bg-muted/40 p-2.5 rounded-lg text-xs space-y-1 border border-border/40">
                      <span className="font-bold text-foreground flex items-center gap-1 text-[11px]">
                        <i className="ph ph-chat-circle-dots text-primary" /> Management Feedback
                      </span>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {item.adminResponse.responseNotes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground mt-3">
                    <span className="text-[11px]">
                      {item.isAnonymous ? "Anonymous Colleague" : item.submittedByName || "Staff Member"}
                    </span>

                    <Button
                      size="xs"
                      variant={hasVoted ? "primary" : "outline"}
                      onClick={() => voteMutation.mutate(item.id)}
                      className="gap-1 font-bold text-xs"
                    >
                      <i className="ph ph-thumbs-up text-xs" />
                      <span>{votesCount}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {displayList.length === 0 && (
          <Card className="border border-dashed border-border/80 rounded-xl bg-card shadow-xs">
            <CardContent className="p-12 text-center text-muted-foreground text-xs space-y-2">
              <div className="size-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <i className="ph ph-lightbulb text-2xl" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No suggestions found</h3>
              <p className="max-w-xs mx-auto">Be the first to share an innovative suggestion or workplace improvement!</p>
            </CardContent>
          </Card>
        )}
      </Tabs>

      {/* ── Dialog: Share Idea ── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-lightbulb text-primary text-lg" />
              <span>Share an Idea or Feedback</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Help make our company better. Your submission will be shared with the community and reviewed by HR leadership.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!createTitle.trim() || !createDescription.trim() || !createCategory) {
                toast.error("Please fill in all required fields.");
                return;
              }
              createSuggestionMutation.mutate({
                title: createTitle,
                description: createDescription,
                categoryId: createCategory,
                isAnonymous: createAnonymous,
              });
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Title <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Brief summary of your idea..."
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category <span className="text-rose-500">*</span></Label>
              <Select value={createCategory} onValueChange={setCreateCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select topic category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description & Expected Benefits <span className="text-rose-500">*</span></Label>
              <Textarea
                placeholder="What problem does this solve? How will it improve our team or workplace?..."
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                className="text-xs min-h-[90px]"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="anonCheck"
                checked={createAnonymous}
                onChange={(e) => setCreateAnonymous(e.target.checked)}
                className="rounded border-border text-primary h-4 w-4"
              />
              <Label htmlFor="anonCheck" className="text-xs cursor-pointer select-none">
                Post anonymously (hide your name from public view)
              </Label>
            </div>

            <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={createSuggestionMutation.isPending}
                className="font-bold"
              >
                Submit Idea
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: View Detail ── */}
      <Dialog open={!!showDetailItem} onOpenChange={(open) => !open && setShowDetailItem(null)}>
        <DialogContent className="max-w-md space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px]">
                {showDetailItem?.categoryName || "General"}
              </Badge>
              <Badge variant="soft" className="text-[10px]">
                {showDetailItem?.status}
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              {showDetailItem?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submitted by {showDetailItem?.isAnonymous ? "Anonymous Colleague" : showDetailItem?.submittedByName || "Staff"} on {showDetailItem?.createdAt ? new Date(showDetailItem.createdAt).toLocaleDateString() : "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/40">
            {showDetailItem?.description}
          </div>

          {showDetailItem?.adminResponse && (
            <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-xs space-y-1">
              <span className="font-bold text-primary flex items-center gap-1.5">
                <i className="ph ph-chat-circle-dots" /> Management Response
              </span>
              <p className="text-muted-foreground">{showDetailItem.adminResponse.responseNotes}</p>
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex items-center justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowDetailItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
