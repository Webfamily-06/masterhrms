import React, { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Calendar,
  ChevronRight,
  Flame,
  ShieldAlert,
  ExternalLink,
  Download,
  FileText,
} from "lucide-react";
import { FormattedAnnouncementContent } from "./rich-text-editor";

interface AnnouncementItem {
  id: string;
  title: string;
  summary?: string;
  content: string;
  category: string;
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

export function EmployeeAnnouncementsWidget() {
  const qc = useQueryClient();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [ackComments, setAckComments] = useState("");

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["my-announcements", "widget"],
    queryFn: async () => {
      try {
        const res = await api.get("/me/organization/announcements", {
          params: { tab: "all" },
        });
        return res.data || res || [];
      } catch {
        return [];
      }
    },
  });

  const announcements: AnnouncementItem[] = Array.isArray(responseData)
    ? responseData
    : (responseData?.data as any) || [];

  const recordViewMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/me/organization/announcements/${id}/view`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-announcements"] });
    },
  });

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
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record compliance acknowledgement");
    },
  });

  const handleOpenDetail = (item: AnnouncementItem) => {
    setSelectedAnnouncement(item);
    setIsDetailModalOpen(true);
    setAckComments("");
    recordViewMutation.mutate(item.id);
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0 h-4 capitalize"><Flame className="h-2.5 w-2.5" /> Urgent</Badge>;
      case "high":
        return <Badge className="gap-1 text-[10px] px-1.5 py-0 h-4 font-medium bg-amber-500 hover:bg-amber-600 text-white capitalize"><AlertCircle className="h-2.5 w-2.5" /> High</Badge>;
      case "low":
        return <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0 h-4 text-muted-foreground capitalize"><Clock className="h-2.5 w-2.5" /> Low</Badge>;
      default:
        return <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 h-4 capitalize">Normal</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded mb-3" />
        <div className="space-y-3">
          <div className="h-14 bg-muted/60 rounded" />
          <div className="h-14 bg-muted/60 rounded" />
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  // Display top 3 announcements
  const topAnnouncements = announcements.slice(0, 3);

  return (
    <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded text-primary">
            <Megaphone className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Company Announcements
          </h3>
          <span className="text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {announcements.length} Active
          </span>
        </div>

        <Link
          to="/me/organization/announcements"
          className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-0.5"
        >
          View All <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Items list */}
      <div className="space-y-2.5">
        {topAnnouncements.map((item) => (
          <div
            key={item.id}
            onClick={() => handleOpenDetail(item)}
            className={`p-3 rounded-md border transition-all hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              item.isPinned ? "border-primary/40 bg-primary/[0.02]" : "border-border-color"
            } ${item.priority === "urgent" ? "border-rose-500/40" : ""}`}
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.isPinned && (
                  <Badge variant="outline" className="gap-1 text-primary text-[10px] px-1 py-0 h-4 border-primary/40">
                    <Pin className="h-2.5 w-2.5 rotate-45" /> Pinned
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                  style={{
                    borderColor: item.categoryModel?.color ? `${item.categoryModel.color}40` : undefined,
                    color: item.categoryModel?.color || undefined,
                  }}
                >
                  {item.categoryModel?.name || item.category.replace(/_/g, " ")}
                </Badge>
                {getPriorityBadge(item.priority)}
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {item.publishDate ? format(new Date(item.publishDate), "dd MMM yyyy") : "-"}
                </span>
              </div>

              <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 hover:text-primary line-clamp-1">
                {item.title}
              </p>

              {item.summary && (
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {item.summary}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
              {item.acknowledgementRequired && (
                item.hasAcknowledged ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] px-1.5 py-0.5 gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Signed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0.5 gap-1 bg-amber-500/5">
                    <ShieldAlert className="h-2.5 w-2.5" /> Sign Required
                  </Badge>
                )
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary hover:text-primary-hover px-2 gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetail(item);
                }}
              >
                Read Notice <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail & Ack Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {getPriorityBadge(selectedAnnouncement.priority)}
                  <Badge variant="outline" style={{ color: selectedAnnouncement.categoryModel?.color }}>
                    {selectedAnnouncement.categoryModel?.name || selectedAnnouncement.category.replace(/_/g, " ")}
                  </Badge>
                  {selectedAnnouncement.isPinned && (
                    <Badge variant="outline" className="text-primary gap-1 text-xs">
                      <Pin className="h-3 w-3 rotate-45" /> Pinned
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground">
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
                  <div className="p-3 bg-muted/40 rounded-lg border text-xs font-medium text-foreground">
                    {selectedAnnouncement.summary}
                  </div>
                )}

                <div className="p-3.5 rounded-lg border bg-card text-foreground">
                  <FormattedAnnouncementContent content={selectedAnnouncement.content} />
                </div>

                {selectedAnnouncement.attachmentUrl && (
                  <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Download className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">Attached Document / Policy PDF</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedAnnouncement.attachmentUrl, "_blank")}
                      className="gap-1 text-xs h-7"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open Attachment
                    </Button>
                  </div>
                )}

                {selectedAnnouncement.acknowledgementRequired && (
                  <div className="mt-3 p-3.5 rounded-lg border bg-muted/30 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Formal Compliance Policy Acknowledgement
                    </div>

                    {selectedAnnouncement.hasAcknowledged ? (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          You signed this policy on{" "}
                          {selectedAnnouncement.acknowledgedAt
                            ? format(new Date(selectedAnnouncement.acknowledgedAt), "dd MMMM yyyy 'at' HH:mm")
                            : "record"}
                        </div>
                        {selectedAnnouncement.ackComments && (
                          <p className="text-muted-foreground pt-0.5 italic text-[11px]">
                            &quot;{selectedAnnouncement.ackComments}&quot;
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          By clicking &quot;Acknowledge & Agree&quot; below, you officially certify that you have read and agree to comply with this notice.
                        </p>

                        <Input
                          placeholder="Optional remarks (e.g. Read and agreed)..."
                          value={ackComments}
                          onChange={(e) => setAckComments(e.target.value)}
                          className="text-xs h-8"
                        />

                        <Button
                          onClick={() =>
                            ackMutation.mutate({
                              id: selectedAnnouncement.id,
                              comments: ackComments || "Acknowledged and agreed.",
                            })
                          }
                          disabled={ackMutation.isPending}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs gap-1.5 h-8"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          I Have Read & Agree to this Notice
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
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

