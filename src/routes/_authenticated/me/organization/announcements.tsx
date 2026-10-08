import { useState } from "react";
import { format } from "date-fns";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Pin,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/organization/announcements")({
  component: MyAnnouncementsPage,
  head: () => ({
    meta: [{ title: "Company Broadcasts & Announcements — Master HRMS" }],
  }),
});

interface AnnouncementItem {
  id: string;
  title: string;
  summary?: string;
  content: string;
  category: string;
  priority: string;
  isPinned: boolean;
  publishDate: string;
  authorName: string;
  acknowledgementRequired: boolean;
  hasAcknowledged: boolean;
  acknowledgedAt?: string;
}

export function MyAnnouncementsPage() {
  const qc = useQueryClient();

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["my-announcements"],
    queryFn: async () => {
      const res = await api.get("/me/organization/announcements");
      return res.data || res || [];
    },
  });

  const announcements: AnnouncementItem[] = Array.isArray(responseData)
    ? responseData
    : (responseData?.data as any) || [];

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/me/organization/announcements/${id}/acknowledge`);
    },
    onSuccess: () => {
      toast.success("Policy acknowledgement recorded.");
      qc.invalidateQueries({ queryKey: ["my-announcements"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to acknowledge announcement");
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Company Broadcasts & Announcements"
        description="Official notices, executive memos, and compliance policies requiring employee review."
        icon={<Megaphone className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">
          Loading company broadcasts...
        </div>
      ) : announcements.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No announcements published at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card
              key={a.id}
              className={`transition-all ${
                a.isPinned ? "border-primary/40 shadow-sm" : ""
              } ${a.priority === "urgent" ? "border-destructive/40 bg-destructive/5" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {a.isPinned && (
                        <Badge variant="outline" className="gap-1 text-primary text-xs">
                          <Pin className="h-3 w-3 rotate-45" />
                          Pinned
                        </Badge>
                      )}
                      <Badge
                        variant={
                          a.priority === "urgent"
                            ? "destructive"
                            : a.priority === "high"
                              ? "default"
                              : "secondary"
                        }
                        className="text-xs capitalize"
                      >
                        {a.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {a.category.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {a.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Published by {a.authorName} on{" "}
                      {format(new Date(a.publishDate), "dd MMMM yyyy")}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {a.summary && (
                  <p className="text-sm font-medium text-foreground bg-muted/30 p-2.5 rounded-lg border">
                    {a.summary}
                  </p>
                )}

                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {a.content}
                </div>

                {/* Acknowledgement Status / Action */}
                {a.acknowledgementRequired && (
                  <div className="pt-3 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">
                        Formal Compliance Acknowledgement Required
                      </span>
                    </div>

                    {a.hasAcknowledged ? (
                      <Badge variant="outline" className="gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Acknowledged on{" "}
                        {a.acknowledgedAt ? format(new Date(a.acknowledgedAt), "dd MMM") : "File"}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => ackMutation.mutate(a.id)}
                        disabled={ackMutation.isPending}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {ackMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Acknowledge & Sign
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
