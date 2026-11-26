'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Megaphone,
  Calendar,
  CheckCircle2,
  MessageSquare,
  Send,
  Eye,
  Sparkles,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DashboardAnnouncement {
  id: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
  priority?: string | null;
  isPinned?: boolean;
  publishDate?: string | null;
  expiryDate?: string | null;
  authorName?: string | null;
  acknowledgementRequired?: boolean;
  userAcknowledged?: boolean;
  acknowledgementsCount?: number;
  _count?: { acknowledgements?: number; views?: number };
}

function formatYmd(d?: string | null) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return format(dt, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function OrganizationAnnouncementsWidget({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const [selectedAnn, setSelectedAnn] = useState<DashboardAnnouncement | null>(null);
  const [responseText, setResponseText] = useState("");
  const [acknowledgedIds, setAcknowledgedIds] = useState<Record<string, boolean>>({});

  const { data: announcements = [], isLoading } = useQuery<DashboardAnnouncement[]>({
    queryKey: ["dashboard-company-announcements"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/organization/announcements", {
          params: { status: "published", limit: 5 },
        });
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return items.slice(0, 4);
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const viewMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/hr/organization/announcements/${id}/view`).catch(() => {});
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments: string }) => {
      return await api.post(`/hr/organization/announcements/${id}/acknowledge`, {
        comments: comments.trim() || "Read and acknowledged.",
      });
    },
    onSuccess: (_res, vars) => {
      setAcknowledgedIds((prev) => ({ ...prev, [vars.id]: true }));
      setResponseText("");
      toast.success("Your response has been recorded.");
      queryClient.invalidateQueries({ queryKey: ["dashboard-company-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to record response.");
    },
  });

  const handleOpenAnnouncement = (ann: DashboardAnnouncement) => {
    setSelectedAnn(ann);
    setResponseText("");
    viewMutation.mutate(ann.id);
  };

  if (!compact && (isLoading || announcements.length === 0)) return null;

  return (
    <>
      <div
        data-testid="dashboard-announcements-widget"
        className={cn(
          "rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col",
          compact ? "w-full h-full mb-0" : "mb-5",
          className
        )}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between gap-2 bg-muted/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground leading-tight truncate">
                Company Announcements
              </h2>
              {!compact && (
                <p className="text-[11px] text-muted-foreground">
                  Organization-wide updates — click any notice to read and respond
                </p>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[11px] bg-primary/10 text-primary border-primary/20 shrink-0"
          >
            {announcements.length} Active
          </Badge>
        </div>

        {/* Announcements List */}
        {isLoading ? (
          <div className="p-6 text-center text-xs text-muted-foreground">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No active company announcements.
          </div>
        ) : (
        <div className={cn("divide-y divide-border/60", compact && "flex-1 overflow-y-auto max-h-[360px]")}>
          {announcements.map((ann) => {
            const isHigh = ann.priority === "high" || ann.priority === "urgent";
            const isAcked = Boolean(ann.userAcknowledged || acknowledgedIds[ann.id]);
            return (
              <div
                key={ann.id}
                className={cn(
                  "px-4 py-3 flex justify-between gap-2.5 hover:bg-muted/30 transition-colors",
                  compact ? "flex-col items-start" : "flex-col sm:flex-row sm:items-center"
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAnnouncement(ann)}
                      className="text-sm font-semibold text-foreground hover:text-primary text-left transition-colors cursor-pointer"
                    >
                      {ann.title}
                    </button>
                    {ann.isPinned && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      >
                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {isHigh && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      >
                        <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                        High Priority
                      </Badge>
                    )}
                    {ann.category && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                        {ann.category.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                  {(ann.summary || ann.content) && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {ann.summary || ann.content}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {ann.publishDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatYmd(ann.publishDate)}
                      </span>
                    )}
                    {ann.authorName && <span>By {ann.authorName}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isAcked ? (
                    <Badge
                      variant="outline"
                      className="h-8 px-2.5 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Responded
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAnnouncement(ann)}
                      className="h-8 px-3 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Read &amp; Respond
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="View Announcement"
                    onClick={() => handleOpenAnnouncement(ann)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Read & Respond Modal */}
      <Dialog open={Boolean(selectedAnn)} onOpenChange={(o) => !o && setSelectedAnn(null)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {selectedAnn?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedAnn?.authorName ? `Published by ${selectedAnn.authorName}` : "Company-wide Announcement"}
              {selectedAnn?.publishDate ? ` • ${formatYmd(selectedAnn.publishDate)}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedAnn && (
            <div className="space-y-4 pt-1">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-foreground whitespace-pre-line max-h-60 overflow-y-auto leading-relaxed">
                {selectedAnn.content || selectedAnn.summary || "No additional details."}
              </div>

              <div className="space-y-2 pt-2 border-t border-border/70">
                <label className="text-xs font-semibold text-foreground block">
                  Your Response / Acknowledgement
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write a response or click Acknowledge..."
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={respondMutation.isPending}
                    onClick={() =>
                      respondMutation.mutate({
                        id: selectedAnn.id,
                        comments: responseText || "Read and acknowledged.",
                      })
                    }
                    className="h-9 px-3.5 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    {respondMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {responseText.trim() ? "Respond" : "Acknowledge"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedAnn(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
