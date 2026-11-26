'use client';

import { useState } from "react";
import { Link } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export type SuggestionStatus = "New" | "Under Review" | "Accepted" | "Rejected" | "Complete";

export interface SuggestionCategory {
  id: string;
  name: string;
  color: string;
  displayOrder: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SuggestionItem {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  submittedById: string;
  submittedByName: string;
  isAnonymous: boolean;
  status: SuggestionStatus;
  votes: string[];
  views: string[];
  voteCount: number;
  viewCount: number;
  adminResponse?: {
    respondedBy: string;
    respondedAt: string;
    responseNotes: string;
    newStatus: SuggestionStatus;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionStatusHistory {
  id: string;
  suggestionId: string;
  suggestionTitle: string;
  changedById: string;
  changedByName: string;
  oldStatus: SuggestionStatus;
  newStatus: SuggestionStatus;
  notes?: string;
  createdAt: string;
}

export default function HrSuggestionsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const currentUserId = profile?.id || "admin";

  const [activeTab, setActiveTab] = useState("suggestions");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modals state
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionItem | null>(null);

  // Admin Response Form
  const [responseStatus, setResponseStatus] = useState<SuggestionStatus>("Under Review");
  const [responseNotes, setResponseNotes] = useState("");

  // Category Form
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#3b82f6");
  const [catDesc, setCatDesc] = useState("");

  // Queries
  const { data: statsRes } = useQuery({
    queryKey: ["hr-suggestion-box-stats"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/suggestion-box/stats");
        return res?.data || res || { total: 0, new: 0, underReview: 0, accepted: 0, rejected: 0, complete: 0, totalVotes: 0, totalViews: 0 };
      } catch {
        return { total: 0, new: 0, underReview: 0, accepted: 0, rejected: 0, complete: 0, totalVotes: 0, totalViews: 0 };
      }
    },
  });
  const stats = statsRes || { total: 0, new: 0, underReview: 0, accepted: 0, rejected: 0, complete: 0, totalVotes: 0, totalViews: 0 };

  const { data: categories = [] } = useQuery<SuggestionCategory[]>({
    queryKey: ["hr-suggestion-box-categories"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/suggestion-box/categories");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery<SuggestionItem[]>({
    queryKey: ["hr-suggestion-box-suggestions", search, statusFilter, categoryFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (categoryFilter !== "all") params.set("categoryId", categoryFilter);

        const res: any = await api.get(`/suggestion-box/suggestions?${params.toString()}`);
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: histories = [] } = useQuery<SuggestionStatusHistory[]>({
    queryKey: ["hr-suggestion-box-histories"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/suggestion-box/history");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: activeTab === "history",
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: SuggestionStatus; notes: string }) => {
      return await api.post(`/suggestion-box/suggestions/${id}/respond`, { status, notes });
    },
    onSuccess: () => {
      toast.success("Suggestion decision recorded and notified.");
      qc.invalidateQueries({ queryKey: ["hr-suggestion-box-suggestions"] });
      qc.invalidateQueries({ queryKey: ["hr-suggestion-box-stats"] });
      qc.invalidateQueries({ queryKey: ["hr-suggestion-box-histories"] });
      setShowResponseModal(false);
      setSelectedSuggestion(null);
      setResponseNotes("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to record response.");
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: { name: string; color: string; description?: string }) => {
      return await api.post("/suggestion-box/categories", payload);
    },
    onSuccess: () => {
      toast.success("Feedback category created.");
      qc.invalidateQueries({ queryKey: ["hr-suggestion-box-categories"] });
      setShowCategoryModal(false);
      setCatName("");
      setCatDesc("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to create category.");
    },
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Organization Suggestion Box & Idea Hub"
        description="Review anonymous and attributed employee ideas, workplace improvements, evaluate community upvotes, and record management decisions."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryModal(true)}
              className="gap-1.5 h-8 font-semibold text-xs"
            >
              <i className="ph ph-tag text-sm" />
              <span>Add Category</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Visual Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Total Submissions</span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <i className="ph ph-lightbulb text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{stats.total} Ideas</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stats.totalVotes || 0} peer upvotes recorded</p>
            </div>
            <div className="text-[11px] text-primary font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-thumbs-up text-xs" />
              <span>Workplace Innovation</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Under Review</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-hourglass-high text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{(stats.new || 0) + (stats.underReview || 0)} Pending</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting management evaluation</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-clock text-xs" />
              <span>Action Pipeline</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Accepted & In Progress</span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-sky-600">{stats.accepted || 0} Accepted</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Scheduled for implementation</p>
            </div>
            <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-rocket-launch text-xs" />
              <span>Approved Plans</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Completed Ideas</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-seal-check text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">{stats.complete || 0} Executed</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Rolled out across organization</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-check-fat text-xs" />
              <span>Delivered Improvements</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed View ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 flex gap-1 w-full sm:w-auto justify-start border border-border/80 rounded-lg">
          <TabsTrigger value="suggestions" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-card">
            <i className="ph ph-lightbulb text-amber-600 text-sm" />
            <span>All Ideas ({suggestions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-card">
            <i className="ph ph-tag text-primary text-sm" />
            <span>Categories ({categories.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-card">
            <i className="ph ph-clock-counter-clockwise text-muted-foreground text-sm" />
            <span>Decision Audit Log</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Suggestions List ── */}
        <TabsContent value="suggestions" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
            <div className="relative w-full sm:w-80">
              <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
              <Input
                placeholder="Search idea title or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs w-40">
                  <SelectValue placeholder="All Categories" />
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

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs w-36">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Idea & Summary</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Category</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Author</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Submitted Date</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Upvotes</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSuggestions ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                        Loading suggestions...
                      </TableCell>
                    </TableRow>
                  ) : suggestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground italic">
                        No employee suggestions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    suggestions.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/40 transition-colors text-xs">
                        <TableCell className="p-3 max-w-[280px]">
                          <span className="font-bold text-foreground block truncate" title={item.title}>
                            {item.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5" title={item.description}>
                            {item.description}
                          </span>
                        </TableCell>

                        <TableCell className="p-3">
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
                        </TableCell>

                        <TableCell className="p-3 text-muted-foreground">
                          {item.isAnonymous ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground italic">
                              <i className="ph ph-user-circle-dashed text-xs" /> Anonymous
                            </span>
                          ) : (
                            <span className="font-semibold text-foreground">{item.submittedByName || "Staff"}</span>
                          )}
                        </TableCell>

                        <TableCell className="p-3 tabular-nums text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </TableCell>

                        <TableCell className="p-3 tabular-nums font-bold text-foreground">
                          <span className="inline-flex items-center gap-1 text-primary">
                            <i className="ph ph-thumbs-up text-xs" /> {item.voteCount || item.votes?.length || 0}
                          </span>
                        </TableCell>

                        <TableCell className="p-3">
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
                        </TableCell>

                        <TableCell className="p-3 text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              setSelectedSuggestion(item);
                              setResponseStatus(item.status);
                              setResponseNotes(item.adminResponse?.responseNotes || "");
                              setShowResponseModal(true);
                            }}
                            className="gap-1 font-semibold text-xs"
                          >
                            <i className="ph ph-chat-circle-dots text-xs" />
                            <span>Respond</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Category Management ── */}
        <TabsContent value="categories" className="space-y-4">
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Color</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Category Name</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Description</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground italic">
                      No categories created yet. Click &quot;Add Category&quot; to define suggestion streams.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id} className="hover:bg-muted/40 transition-colors text-xs">
                      <TableCell className="p-3">
                        <div className="size-4 rounded-full border" style={{ backgroundColor: cat.color }} />
                      </TableCell>
                      <TableCell className="p-3 font-bold text-foreground">{cat.name}</TableCell>
                      <TableCell className="p-3 text-muted-foreground">{cat.description || "—"}</TableCell>
                      <TableCell className="p-3 text-right">
                        <Badge variant="soft" className="text-[10px]">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Tab 3: History Audit ── */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Idea Title</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Reviewed By</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Decision</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Supervisor Notes</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {histories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground italic">
                      No decision history recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  histories.map((h) => (
                    <TableRow key={h.id} className="hover:bg-muted/40 transition-colors text-xs">
                      <TableCell className="p-3 font-semibold text-foreground">{h.suggestionTitle}</TableCell>
                      <TableCell className="p-3 text-muted-foreground">{h.changedByName || "HR Admin"}</TableCell>
                      <TableCell className="p-3">
                        <Badge variant="outline" className="text-[10px] font-bold">{h.newStatus}</Badge>
                      </TableCell>
                      <TableCell className="p-3 text-muted-foreground max-w-[200px] truncate">{h.notes || "—"}</TableCell>
                      <TableCell className="p-3 tabular-nums text-muted-foreground text-right">
                        {new Date(h.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Management Response ── */}
      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-chat-circle-dots text-primary text-lg" />
              <span>Record Decision & Feedback</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Idea: &quot;{selectedSuggestion?.title}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">New Status Decision</Label>
              <Select value={responseStatus} onValueChange={(val: any) => setResponseStatus(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Accepted">Accepted (Plan Execution)</SelectItem>
                  <SelectItem value="Complete">Complete (Implemented)</SelectItem>
                  <SelectItem value="Rejected">Rejected (Not Feasible)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Feedback & Implementation Plan</Label>
              <Textarea
                placeholder="Explain the next steps or rationale to the team..."
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                className="text-xs min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowResponseModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (!selectedSuggestion) return;
                updateStatusMutation.mutate({
                  id: selectedSuggestion.id,
                  status: responseStatus,
                  notes: responseNotes,
                });
              }}
              className="font-bold"
            >
              Submit Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Category ── */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-tag text-primary text-lg" />
              <span>Add Feedback Stream Category</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category Name <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="e.g. Workplace Culture, IT Tools, Cafeteria"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="size-8 rounded border p-0.5"
                />
                <Input
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="h-9 text-xs tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                placeholder="Optional description of topics covered by this category..."
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={createCategoryMutation.isPending}
              onClick={() => {
                if (!catName.trim()) {
                  toast.error("Category name is required.");
                  return;
                }
                createCategoryMutation.mutate({
                  name: catName,
                  color: catColor,
                  description: catDesc,
                });
              }}
              className="font-bold"
            >
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
