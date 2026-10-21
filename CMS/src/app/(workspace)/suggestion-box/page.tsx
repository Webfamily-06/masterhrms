'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lightbulb,
  Plus,
  ThumbsUp,
  Eye,
  Search,
  Filter,
  Download,
  MessageSquare,
  History,
  Tag,
  UserCheck,
  Shield,
  Loader2,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";



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

function SuggestionBoxPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const currentUserId = profile?.id || "user";
  const userRoles = profile?.roles || [];
  const isAdmin = userRoles.some((r) => ["admin", "super_admin", "hr_admin", "manager"].includes(r));

  const [activeTab, setActiveTab] = useState("suggestions");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<SuggestionCategory | null>(null);

  // Create Suggestion Form
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createAnonymous, setCreateAnonymous] = useState(false);

  // Admin Response Form
  const [responseStatus, setResponseStatus] = useState<SuggestionStatus>("Under Review");
  const [responseNotes, setResponseNotes] = useState("");

  // Category Form
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#3b82f6");
  const [catOrder, setCatOrder] = useState(1);
  const [catDesc, setCatDesc] = useState("");
  const [catActive, setCatActive] = useState(true);

  // 1. Fetch Stats
  const { data: statsRes } = useQuery({
    queryKey: ["suggestion-box-stats"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>("/suggestion-box/stats");
      return res.data;
    },
  });
  const stats = statsRes || { total: 0, new: 0, underReview: 0, accepted: 0, rejected: 0, complete: 0, totalVotes: 0, totalViews: 0 };

  // 2. Fetch Categories
  const { data: categories = [] } = useQuery<SuggestionCategory[]>({
    queryKey: ["suggestion-box-categories"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: SuggestionCategory[] }>("/suggestion-box/categories");
      return res.data || [];
    },
  });

  // 3. Fetch Suggestions
  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery<SuggestionItem[]>({
    queryKey: ["suggestion-box-suggestions", search, statusFilter, categoryFilter, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (activeTab === "my-suggestions") params.set("mineOnly", "true");

      const res = await api.get<{ success: boolean; data: SuggestionItem[] }>(`/suggestion-box/suggestions?${params.toString()}`);
      return res.data || [];
    },
  });

  // 4. Fetch Status Histories
  const { data: histories = [] } = useQuery<SuggestionStatusHistory[]>({
    queryKey: ["suggestion-box-histories"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: SuggestionStatusHistory[] }>("/suggestion-box/history");
      return res.data || [];
    },
    enabled: activeTab === "history",
  });

  // ─── MUTATIONS ──────────────────────────────────────────────────────────────

  const createSuggestionMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; categoryId: string; isAnonymous: boolean }) => {
      return await api.post("/suggestion-box/suggestions", payload);
    },
    onSuccess: () => {
      toast.success("Suggestion submitted successfully!");
      setShowCreateModal(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateAnonymous(false);
      qc.invalidateQueries({ queryKey: ["suggestion-box-suggestions"] });
      qc.invalidateQueries({ queryKey: ["suggestion-box-stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit suggestion");
    },
  });

  const deleteSuggestionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/suggestion-box/suggestions/${id}`);
    },
    onSuccess: () => {
      toast.success("Suggestion removed");
      qc.invalidateQueries({ queryKey: ["suggestion-box-suggestions"] });
      qc.invalidateQueries({ queryKey: ["suggestion-box-stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete suggestion");
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/suggestion-box/suggestions/${id}/vote`, {});
    },
    onSuccess: (data: any) => {
      toast.success(data?.data?.voted ? "Vote recorded!" : "Vote removed");
      qc.invalidateQueries({ queryKey: ["suggestion-box-suggestions"] });
      qc.invalidateQueries({ queryKey: ["suggestion-box-stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Could not vote on suggestion");
    },
  });

  const adminResponseMutation = useMutation({
    mutationFn: async (payload: { id: string; status: SuggestionStatus; responseNotes: string }) => {
      return await api.post(`/suggestion-box/suggestions/${payload.id}/respond`, {
        status: payload.status,
        responseNotes: payload.responseNotes,
      });
    },
    onSuccess: () => {
      toast.success("Response recorded and status updated!");
      setShowResponseModal(false);
      setResponseNotes("");
      qc.invalidateQueries({ queryKey: ["suggestion-box-suggestions"] });
      qc.invalidateQueries({ queryKey: ["suggestion-box-stats"] });
      qc.invalidateQueries({ queryKey: ["suggestion-box-histories"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save response");
    },
  });

  const categoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingCategory) {
        return await api.put(`/suggestion-box/categories/${editingCategory.id}`, payload);
      }
      return await api.post("/suggestion-box/categories", payload);
    },
    onSuccess: () => {
      toast.success(editingCategory ? "Category updated" : "Category created");
      setShowCategoryModal(false);
      setEditingCategory(null);
      qc.invalidateQueries({ queryKey: ["suggestion-box-categories"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Category operation failed");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/suggestion-box/categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["suggestion-box-categories"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete category");
    },
  });

  // Export handler
  function handleExport(format: "csv" | "json") {
    window.open(`/api/suggestion-box/export?format=${format}`, "_blank");
  }

  // Status Badge Helper
  function getStatusBadge(status: SuggestionStatus) {
    switch (status) {
      case "New":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">New</Badge>;
      case "Under Review":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Under Review</Badge>;
      case "Accepted":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Accepted</Badge>;
      case "Rejected":
        return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20">Rejected</Badge>;
      case "Complete":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Complete</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Lightbulb className="size-6 text-amber-500 animate-pulse" /> Employee Voice & Suggestion Box
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Empower employee innovation, transparent voting, category workflows, and management decision tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setCreateCategory(categories[0]?.id || "");
              setShowCreateModal(true);
            }}
            className="gap-2 shadow-sm"
          >
            <Plus className="size-4" /> Share an Idea
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="gap-1.5">
              <Download className="size-4" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="suggestions" className="gap-1.5 text-xs">
            <Lightbulb className="size-3.5" /> All Ideas
          </TabsTrigger>
          <TabsTrigger value="my-suggestions" className="gap-1.5 text-xs">
            <UserCheck className="size-3.5" /> My Ideas
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
              <Shield className="size-3.5" /> Admin Dashboard
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <History className="size-3.5" /> Status History
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="categories" className="gap-1.5 text-xs">
              <Tag className="size-3.5" /> Categories
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── TAB 1: SUGGESTIONS GRID ────────────────────────────────────────── */}
        <TabsContent value="suggestions" className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-lg border">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search ideas or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] text-xs h-9">
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
                <SelectTrigger className="w-[140px] text-xs h-9">
                  <SelectValue placeholder="All Statuses" />
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
              {(search || statusFilter !== "all" || categoryFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                  }}
                  className="text-xs h-9"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Ideas Card Grid */}
          {isLoadingSuggestions ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading suggestions...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-16 text-center border rounded-xl border-dashed bg-muted/20 space-y-3">
              <Lightbulb className="size-10 mx-auto text-muted-foreground/60" />
              <h3 className="font-bold text-sm">No suggestions found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Be the first to share an idea! Suggestions are open to all employees and can be submitted anonymously.
              </p>
              <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-1.5">
                <Plus className="size-3.5" /> Submit First Idea
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestions.map((item) => {
                const hasVoted = item.votes?.includes(currentUserId);
                const isMyOwn = item.submittedById === currentUserId;

                return (
                  <Card key={item.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: item.categoryColor || "#3b82f6" }}
                        >
                          {item.categoryName}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      <CardTitle
                        className="text-base line-clamp-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => {
                          setSelectedSuggestion(item);
                          setShowViewModal(true);
                        }}
                      >
                        {item.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-xs mt-1">
                        {item.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 pb-3 text-xs text-muted-foreground space-y-2">
                      <div className="flex items-center justify-between text-[11px] border-t pt-2.5">
                        <span className="flex items-center gap-1.5">
                          {item.isAnonymous ? (
                            <span className="flex items-center gap-1 text-muted-foreground font-mono">
                              <UserX className="size-3" /> Anonymous
                            </span>
                          ) : (
                            <span className="font-medium text-foreground">{item.submittedByName}</span>
                          )}
                        </span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Admin feedback preview if present */}
                      {item.adminResponse && (
                        <div className="bg-primary/5 border border-primary/15 rounded p-2 text-[11px] text-foreground">
                          <p className="font-semibold text-primary flex items-center gap-1">
                            <MessageSquare className="size-3" /> Admin Response:
                          </p>
                          <p className="line-clamp-1 italic mt-0.5">{item.adminResponse.responseNotes}</p>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-2 border-t flex items-center justify-between bg-muted/20">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="size-3.5" /> {item.viewCount || 1}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="size-3.5" /> {item.voteCount || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant={hasVoted ? "default" : "outline"}
                          size="sm"
                          disabled={isMyOwn}
                          onClick={() => voteMutation.mutate(item.id)}
                          className="h-8 text-xs gap-1"
                          title={isMyOwn ? "You cannot vote on your own suggestion" : "Support this idea"}
                        >
                          <ThumbsUp className="size-3" />
                          {hasVoted ? "Voted" : "Vote"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSuggestion(item);
                            setShowViewModal(true);
                          }}
                          className="h-8 text-xs"
                        >
                          View
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 2: MY SUGGESTIONS ────────────────────────────────────────── */}
        <TabsContent value="my-suggestions" className="space-y-4">
          <div className="bg-card p-4 rounded-lg border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">My Submitted Ideas</h3>
                <p className="text-xs text-muted-foreground">
                  Track your personal ideas, monitor admin feedback, and edit or withdraw ideas while in 'New' status.
                </p>
              </div>
              <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-1.5">
                <Plus className="size-3.5" /> Share Idea
              </Button>
            </div>

            {suggestions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                You haven't submitted any suggestions yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((item) => (
                  <Card key={item.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: item.categoryColor || "#3b82f6" }}
                      >
                        {item.categoryName}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-3">
                        <span>{item.voteCount} votes</span>
                        <span>{item.viewCount} views</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status === "New" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              if (confirm("Delete this suggestion?")) {
                                deleteSuggestionMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="size-3 mr-1" /> Delete
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedSuggestion(item);
                            setShowViewModal(true);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── TAB 3: ADMIN DASHBOARD ───────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="dashboard" className="space-y-4">
            {/* Status Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="p-3 text-center bg-card">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total</p>
                <p className="text-2xl font-black mt-0.5">{stats.total}</p>
              </Card>
              <Card className="p-3 text-center bg-blue-500/5 border-blue-500/20">
                <p className="text-[11px] font-semibold text-blue-500 uppercase">New</p>
                <p className="text-2xl font-black text-blue-600 mt-0.5">{stats.new}</p>
              </Card>
              <Card className="p-3 text-center bg-amber-500/5 border-amber-500/20">
                <p className="text-[11px] font-semibold text-amber-500 uppercase">Under Review</p>
                <p className="text-2xl font-black text-amber-600 mt-0.5">{stats.underReview}</p>
              </Card>
              <Card className="p-3 text-center bg-emerald-500/5 border-emerald-500/20">
                <p className="text-[11px] font-semibold text-emerald-500 uppercase">Accepted</p>
                <p className="text-2xl font-black text-emerald-600 mt-0.5">{stats.accepted}</p>
              </Card>
              <Card className="p-3 text-center bg-rose-500/5 border-rose-500/20">
                <p className="text-[11px] font-semibold text-rose-500 uppercase">Rejected</p>
                <p className="text-2xl font-black text-rose-600 mt-0.5">{stats.rejected}</p>
              </Card>
              <Card className="p-3 text-center bg-purple-500/5 border-purple-500/20">
                <p className="text-[11px] font-semibold text-purple-500 uppercase">Complete</p>
                <p className="text-2xl font-black text-purple-600 mt-0.5">{stats.complete}</p>
              </Card>
            </div>

            {/* Admin Table View */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Admin Review & Decision Table</CardTitle>
                  <CardDescription className="text-xs">
                    Review all employee submissions, provide feedback, and record official acceptance or rejection.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="gap-1.5 text-xs">
                  <Download className="size-3.5" /> Export Data
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Votes</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                          No suggestions to display.
                        </TableCell>
                      </TableRow>
                    ) : (
                      suggestions.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold text-xs max-w-xs truncate">{item.title}</TableCell>
                          <TableCell className="text-xs">
                            {item.isAnonymous ? (
                              <span className="text-muted-foreground font-mono">Anonymous</span>
                            ) : (
                              item.submittedByName
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] text-white font-medium"
                              style={{ backgroundColor: item.categoryColor || "#3b82f6" }}
                            >
                              {item.categoryName}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{item.voteCount}</TableCell>
                          <TableCell className="text-xs font-mono">{item.viewCount}</TableCell>
                          <TableCell className="text-xs">{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setSelectedSuggestion(item);
                                setResponseStatus(item.status);
                                setResponseNotes(item.adminResponse?.responseNotes || "");
                                setShowResponseModal(true);
                              }}
                            >
                              <MessageSquare className="size-3" /> Respond
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setSelectedSuggestion(item);
                                setShowViewModal(true);
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ─── TAB 4: STATUS HISTORY ────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="size-4 text-primary" /> Status Change Audit History
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable audit trail tracking all suggestion submissions, reviewer transitions, and decisions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Suggestion</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Old Status</TableHead>
                    <TableHead>New Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                        No status transitions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    histories.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-semibold text-xs">{h.suggestionTitle}</TableCell>
                        <TableCell className="text-xs">{h.changedByName}</TableCell>
                        <TableCell>{getStatusBadge(h.oldStatus)}</TableCell>
                        <TableCell>{getStatusBadge(h.newStatus)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground italic max-w-sm truncate">
                          {h.notes || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(h.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 5: CATEGORIES MANAGEMENT ─────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Tag className="size-4 text-primary" /> Suggestion Categories
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define topic buckets and their distinctive color coding across suggestion cards.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingCategory(null);
                    setCatName("");
                    setCatColor("#3b82f6");
                    setCatOrder(categories.length + 1);
                    setCatDesc("");
                    setCatActive(true);
                    setShowCategoryModal(true);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="size-3.5" /> Add Category
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Color</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="size-5 rounded border shadow-sm" style={{ backgroundColor: c.color }} />
                        </TableCell>
                        <TableCell className="font-semibold text-xs">{c.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.description || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{c.displayOrder}</TableCell>
                        <TableCell>
                          {c.isActive ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setEditingCategory(c);
                              setCatName(c.name);
                              setCatColor(c.color);
                              setCatOrder(c.displayOrder);
                              setCatDesc(c.description || "");
                              setCatActive(c.isActive);
                              setShowCategoryModal(true);
                            }}
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete category "${c.name}"?`)) {
                                deleteCategoryMutation.mutate(c.id);
                              }
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ─── MODAL: CREATE SUGGESTION ────────────────────────────────────────── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Lightbulb className="size-5 text-amber-500" /> Share a New Suggestion
            </DialogTitle>
            <DialogDescription className="text-xs">
              Help improve our company culture, operational efficiency, or customer workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Title of your idea *</Label>
              <Input
                placeholder="e.g. Implement flex-time work policy on Fridays"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category *</Label>
              <Select value={createCategory} onValueChange={setCreateCategory}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Detailed Description *</Label>
              <Textarea
                placeholder="Describe your idea, what problem it solves, and how it can be implemented..."
                rows={4}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded border">
              <input
                type="checkbox"
                id="anon"
                checked={createAnonymous}
                onChange={(e) => setCreateAnonymous(e.target.checked)}
                className="size-4 rounded text-primary"
              />
              <label htmlFor="anon" className="text-xs cursor-pointer select-none">
                <strong>Submit anonymously</strong>
                <p className="text-[11px] text-muted-foreground">
                  Your name and identity will be hidden from everyone, including coworkers and reviewers.
                </p>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createSuggestionMutation.isPending || !createTitle.trim() || !createDescription.trim()}
              onClick={() => {
                createSuggestionMutation.mutate({
                  title: createTitle,
                  description: createDescription,
                  categoryId: createCategory || categories[0]?.id,
                  isAnonymous: createAnonymous,
                });
              }}
            >
              {createSuggestionMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Submit Idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: VIEW SUGGESTION DETAILS ─────────────────────────────────── */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-lg">
          {selectedSuggestion && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: selectedSuggestion.categoryColor || "#3b82f6" }}
                  >
                    {selectedSuggestion.categoryName}
                  </span>
                  {getStatusBadge(selectedSuggestion.status)}
                </div>
                <DialogTitle className="text-lg font-bold">{selectedSuggestion.title}</DialogTitle>
                <DialogDescription className="text-xs flex items-center gap-3">
                  <span>
                    By: <strong>{selectedSuggestion.isAnonymous ? "Anonymous Employee" : selectedSuggestion.submittedByName}</strong>
                  </span>
                  <span>•</span>
                  <span>{new Date(selectedSuggestion.createdAt).toLocaleString()}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">Idea Description:</h4>
                  <div className="bg-muted/30 p-3 rounded-lg border whitespace-pre-wrap leading-relaxed">
                    {selectedSuggestion.description}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-card border rounded-lg">
                  <div>
                    <p className="text-muted-foreground text-[11px]">Total Upvotes</p>
                    <p className="text-xl font-bold flex items-center gap-1.5 text-primary mt-0.5">
                      <ThumbsUp className="size-4" /> {selectedSuggestion.voteCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[11px]">Engagement Views</p>
                    <p className="text-xl font-bold flex items-center gap-1.5 text-foreground mt-0.5">
                      <Eye className="size-4" /> {selectedSuggestion.viewCount}
                    </p>
                  </div>
                </div>

                {selectedSuggestion.adminResponse ? (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1">
                    <p className="font-semibold text-primary flex items-center gap-1.5">
                      <MessageSquare className="size-4" /> Management Review & Decision:
                    </p>
                    <p className="text-xs leading-relaxed mt-1">{selectedSuggestion.adminResponse.responseNotes}</p>
                    <p className="text-[10px] text-muted-foreground pt-1 border-t mt-2">
                      Responded by {selectedSuggestion.adminResponse.respondedBy} on{" "}
                      {new Date(selectedSuggestion.adminResponse.respondedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/20 border border-dashed rounded-lg text-center text-muted-foreground text-[11px]">
                    Awaiting administrator review and feedback.
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between">
                {isAdmin ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowViewModal(false);
                      setResponseStatus(selectedSuggestion.status);
                      setResponseNotes(selectedSuggestion.adminResponse?.responseNotes || "");
                      setShowResponseModal(true);
                    }}
                    className="gap-1 text-xs"
                  >
                    <MessageSquare className="size-3.5" /> Update Review / Respond
                  </Button>
                ) : (
                  <div />
                )}
                <Button size="sm" onClick={() => setShowViewModal(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: ADMIN RESPONSE ──────────────────────────────────────────── */}
      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="size-5 text-primary" /> Review & Respond to Idea
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide feedback or change the suggestion lifecycle status.
            </DialogDescription>
          </DialogHeader>

          {selectedSuggestion && (
            <div className="space-y-4 py-2">
              <div className="p-2.5 bg-muted/40 rounded border text-xs">
                <p className="font-semibold">{selectedSuggestion.title}</p>
                <p className="text-muted-foreground text-[11px] line-clamp-1 mt-0.5">{selectedSuggestion.description}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Lifecycle Status *</Label>
                <Select value={responseStatus} onValueChange={(val) => setResponseStatus(val as SuggestionStatus)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Accepted">Accepted (Approved for Implementation)</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Complete">Complete (Implemented)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Official Admin Feedback / Response Notes *</Label>
                <Textarea
                  placeholder="Explain the review decision, next steps, or reasons for acceptance/rejection..."
                  rows={4}
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowResponseModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={adminResponseMutation.isPending || !responseNotes.trim()}
              onClick={() => {
                if (selectedSuggestion) {
                  adminResponseMutation.mutate({
                    id: selectedSuggestion.id,
                    status: responseStatus,
                    responseNotes,
                  });
                }
              }}
            >
              {adminResponseMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Save Response & Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: CREATE / EDIT CATEGORY ─────────────────────────────────── */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Tag className="size-5 text-primary" />
              {editingCategory ? "Edit Category" : "Add Suggestion Category"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Categories help organize employee ideas into structured innovation domains.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category Name *</Label>
              <Input
                placeholder="e.g. Workplace Amenities"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Badge Color *</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="size-8 rounded cursor-pointer border"
                  />
                  <Input
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Display Order</Label>
                <Input
                  type="number"
                  value={catOrder}
                  onChange={(e) => setCatOrder(parseInt(e.target.value) || 1)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                placeholder="Short summary of this topic..."
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="catActive"
                checked={catActive}
                onChange={(e) => setCatActive(e.target.checked)}
                className="size-4 rounded text-primary"
              />
              <label htmlFor="catActive" className="text-xs cursor-pointer select-none font-semibold">
                Category is Active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={categoryMutation.isPending || !catName.trim()}
              onClick={() => {
                categoryMutation.mutate({
                  name: catName,
                  color: catColor,
                  displayOrder: catOrder,
                  description: catDesc,
                  isActive: catActive,
                });
              }}
            >
              {categoryMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
              {editingCategory ? "Update Category" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SuggestionBoxPage;
