'use client';

import React, { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Megaphone,
  Pin,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Search,
  Calendar,
  Eye,
  FileCheck,
  Flame,
  LayoutGrid,
  List as ListIcon,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  FileText,
} from "lucide-react";
import { FormattedAnnouncementContent } from "@/components/announcements/rich-text-editor";

interface AnnouncementItem {
  id: string;
  title: string;
  summary?: string;
  content: string;
  category: string;
  categoryId?: string;
  categoryModel?: { name: string; color: string; icon: string };
  priority: string;
  status: string;
  isPinned: boolean;
  publishDate: string;
  expiryDate?: string;
  authorName: string;
  attachmentUrl?: string;
  acknowledgementRequired: boolean;
  hasAcknowledged: boolean;
  acknowledgedAt?: string;
  ackComments?: string;
  hasViewed: boolean;
  myViewCount?: number;
  myLastViewedAt?: string;
}

export default function MyAnnouncementsPage() {
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"all" | "high_priority" | "featured" | "upcoming">("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [ackComments, setAckComments] = useState("");

  // 1. Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["announcement-categories"],
    queryFn: async () => {
      try {
        const res = await api.get("/announcements/categories");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch Employee Announcements
  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ["my-announcements", activeTab, search, selectedCategory],
    queryFn: async () => {
      const res = await api.get("/me/organization/announcements", {
        params: {
          tab: activeTab,
          search: search || undefined,
          category: selectedCategory !== "all" ? selectedCategory : undefined,
        },
      });
      return res.data || res || [];
    },
  });

  const announcements: AnnouncementItem[] = Array.isArray(responseData)
    ? responseData
    : (responseData?.data as any) || [];

  // View recording mutation
  const recordViewMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/me/organization/announcements/${id}/view`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-announcements"] });
    },
  });

  // Acknowledge mutation
  const ackMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      return await api.post(`/me/organization/announcements/${id}/acknowledge`, { comments });
    },
    onSuccess: () => {
      toast.success("Policy formal compliance signature recorded.");
      qc.invalidateQueries({ queryKey: ["my-announcements"] });
      if (selectedAnnouncement) {
        setSelectedAnnouncement({
          ...selectedAnnouncement,
          hasAcknowledged: true,
          acknowledgedAt: new Date().toISOString(),
          ackComments,
        });
      }
      setAckComments("");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record compliance acknowledgement");
    },
  });

  const openAnnouncementDetails = (item: AnnouncementItem) => {
    setSelectedAnnouncement(item);
    setIsDetailModalOpen(true);
    setAckComments("");
    // Record view in background
    recordViewMutation.mutate(item.id);
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return <Badge variant="destructive" className="gap-1 text-xs capitalize"><Flame className="h-3 w-3" /> Urgent</Badge>;
      case "high":
        return <Badge className="gap-1 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white capitalize"><AlertCircle className="h-3 w-3" /> High</Badge>;
      case "low":
        return <Badge variant="secondary" className="gap-1 text-xs text-muted-foreground capitalize"><Clock className="h-3 w-3" /> Low</Badge>;
      default:
        return <Badge variant="outline" className="gap-1 text-xs capitalize">Normal</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Company Announcements & Broadcasts"
        description="Official notices, executive directives, and compliance policies requiring employee review."
        icon={<Megaphone className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Overview", href: "/me/dashboard" },
          { label: "Organization", href: "/me/organization/structure" },
          { label: "Announcements" },
        ]}
      />

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b overflow-x-auto space-x-1">
        {[
          { key: "all", label: "All Announcements", icon: Megaphone },
          { key: "high_priority", label: "High Priority & Urgent", icon: Flame },
          { key: "featured", label: "Featured & Pinned", icon: Pin },
          { key: "upcoming", label: "Upcoming Notices", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.slug}>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || selectedCategory !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedCategory("all");
              }}
              className="text-xs text-muted-foreground"
            >
              Reset
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-muted p-0.5 rounded border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("cards")}
            className={`h-7 px-2.5 text-xs ${viewMode === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1" />
            Cards
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={`h-7 px-2.5 text-xs ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <ListIcon className="h-3.5 w-3.5 mr-1" />
            Compact
          </Button>
        </div>
      </div>

      {/* ── Content Area: Cards or Compact List ── */}
      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">
          Loading company broadcasts...
        </div>
      ) : announcements.length === 0 ? (
        <div className="py-20 text-center rounded-lg border bg-card p-8">
          <Megaphone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground">No announcements found</p>
          <p className="text-xs text-muted-foreground mt-1">
            There are currently no announcements matching your selected view criteria.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {announcements.map((item) => (
            <Card
              key={item.id}
              className={`flex flex-col justify-between transition-all hover:shadow-md cursor-pointer ${
                item.isPinned ? "border-primary/40 shadow-sm" : ""
              } ${item.priority === "urgent" ? "border-rose-500/40" : ""}`}
              onClick={() => openAnnouncementDetails(item)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.isPinned && (
                      <Badge variant="outline" className="gap-1 text-primary text-[10px] px-1 py-0 h-4 border-primary/40">
                        <Pin className="h-2.5 w-2.5 rotate-45" />
                        Pinned
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-xs font-normal"
                      style={{
                        borderColor: item.categoryModel?.color ? `${item.categoryModel.color}40` : undefined,
                        backgroundColor: item.categoryModel?.color ? `${item.categoryModel.color}15` : undefined,
                        color: item.categoryModel?.color || undefined,
                      }}
                    >
                      {item.categoryModel?.name || item.category.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {getPriorityBadge(item.priority)}
                </div>

                <CardTitle className="text-base font-bold text-foreground line-clamp-2 leading-snug">
                  {item.title}
                </CardTitle>

                <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {item.publishDate ? format(new Date(item.publishDate), "dd MMMM yyyy") : "-"}
                </p>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {item.summary ? (
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {item.summary}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {item.content.replace(/#|\*|`|\[.*?\]\(.*?\)/g, "").slice(0, 150)}...
                  </p>
                )}

                {/* Compliance Ack Badge */}
                {item.acknowledgementRequired && (
                  <div className="pt-2 border-t">
                    {item.hasAcknowledged ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] gap-1 font-normal w-full justify-center py-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Signed Policy
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[11px] gap-1 font-medium w-full justify-center py-1 bg-amber-500/5">
                        <ShieldAlert className="h-3 w-3" />
                        Action Required: Sign Policy
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    By {item.authorName}
                  </span>
                  <span className="text-primary font-semibold flex items-center gap-0.5 hover:underline">
                    Read Notice <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Compact List View */
        <div className="space-y-3">
          {announcements.map((item) => (
            <div
              key={item.id}
              onClick={() => openAnnouncementDetails(item)}
              className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.isPinned && (
                    <Badge variant="outline" className="gap-1 text-primary text-[10px] h-4">
                      <Pin className="h-2.5 w-2.5 rotate-45" />
                      Pinned
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: item.categoryModel?.color ? `${item.categoryModel.color}40` : undefined,
                      color: item.categoryModel?.color || undefined,
                    }}
                  >
                    {item.categoryModel?.name || item.category.replace(/_/g, " ")}
                  </Badge>
                  {getPriorityBadge(item.priority)}
                  <span className="text-xs text-muted-foreground">
                    {item.publishDate ? format(new Date(item.publishDate), "dd MMM yyyy") : "-"}
                  </span>
                </div>

                <p className="font-semibold text-sm text-foreground hover:text-primary">
                  {item.title}
                </p>

                {item.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{item.summary}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {item.acknowledgementRequired && (
                  item.hasAcknowledged ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Signed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs gap-1">
                      <ShieldAlert className="h-3 w-3" /> Pending Sign
                    </Badge>
                  )
                )}

                <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                  Read More
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Employee Read & Acknowledge Modal ── */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {getPriorityBadge(selectedAnnouncement.priority)}
                  <Badge variant="outline" style={{ color: selectedAnnouncement.categoryModel?.color }}>
                    {selectedAnnouncement.categoryModel?.name || selectedAnnouncement.category.replace(/_/g, " ")}
                  </Badge>
                  {selectedAnnouncement.isPinned && (
                    <Badge variant="outline" className="text-primary gap-1">
                      <Pin className="h-3 w-3 rotate-45" /> Pinned
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-foreground">
                      {selectedAnnouncement.title}
                    </DialogTitle>
                    <DialogDescription className="mt-0.5">
                      Published by {selectedAnnouncement.authorName} on{" "}
                      {selectedAnnouncement.publishDate ? format(new Date(selectedAnnouncement.publishDate), "dd MMMM yyyy") : "-"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {selectedAnnouncement.summary && (
                  <div className="p-3 bg-muted/40 rounded-lg border text-sm font-medium text-foreground">
                    {selectedAnnouncement.summary}
                  </div>
                )}

                <div className="p-4 rounded-lg border bg-card text-foreground">
                  <FormattedAnnouncementContent content={selectedAnnouncement.content} />
                </div>

                {selectedAnnouncement.attachmentUrl && (
                  <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Download className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">Attached Document / Policy PDF</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedAnnouncement.attachmentUrl, "_blank")}
                      className="gap-1 text-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Attachment
                    </Button>
                  </div>
                )}

                {/* ── Policy Acknowledgement Section ── */}
                {selectedAnnouncement.acknowledgementRequired && (
                  <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Formal Compliance Policy Acknowledgement
                    </div>

                    {selectedAnnouncement.hasAcknowledged ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          You acknowledged and signed this policy on{" "}
                          {selectedAnnouncement.acknowledgedAt
                            ? format(new Date(selectedAnnouncement.acknowledgedAt), "dd MMMM yyyy 'at' HH:mm")
                            : "record"}
                        </div>
                        {selectedAnnouncement.ackComments && (
                          <p className="text-muted-foreground pt-1 italic">
                            &quot;{selectedAnnouncement.ackComments}&quot;
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          By clicking &quot;Acknowledge & Agree&quot; below, you officially certify that you have received, read, and agree to abide by the requirements and compliance obligations set forth in this notice.
                        </p>

                        <div className="space-y-1.5">
                          <Input
                            placeholder="Optional acknowledgement remarks (e.g. Read and agreed)..."
                            value={ackComments}
                            onChange={(e) => setAckComments(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>

                        <Button
                          onClick={() =>
                            ackMutation.mutate({
                              id: selectedAnnouncement.id,
                              comments: ackComments || "Acknowledged and agreed.",
                            })
                          }
                          disabled={ackMutation.isPending}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          I Have Read & Agree to this Notice
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
