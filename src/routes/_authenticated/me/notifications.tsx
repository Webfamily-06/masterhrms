import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  ShieldAlert,
  Calendar,
  GraduationCap,
  FileText,
  Laptop,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/me/notifications")({
  component: EmployeeNotificationsPage,
  head: () => ({ meta: [{ title: "My Notifications — Master HRMS" }] }),
});

interface Notification {
  id: string;
  title: string;
  body: string;
  module: string;
  channel: string;
  linkTo?: string;
  readAt?: string;
  createdAt: string;
}

export function EmployeeNotificationsPage() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }>({
    queryKey: ["me-notifications-list", unreadOnly],
    queryFn: async () => {
      const res = await api.get<any>("/me/notifications", {
        params: { unread: unreadOnly ? "true" : "false", limit: 50 },
      });
      return res || { notifications: [], total: 0, unreadCount: 0 };
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const totalCount = data?.total || 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/shared/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-notifications-list"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/shared/notifications/read-all");
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["me-notifications-list"] });
    },
  });

  const getModuleIcon = (module: string) => {
    switch (module?.toUpperCase()) {
      case "MEETINGS":
        return <Calendar className="size-4 text-blue-500" />;
      case "TRAINING":
        return <GraduationCap className="size-4 text-purple-500" />;
      case "ASSETS":
        return <Laptop className="size-4 text-emerald-500" />;
      case "DOCUMENTS":
        return <FileText className="size-4 text-amber-500" />;
      default:
        return <Bell className="size-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Notifications"
        description="Your personal updates, meeting invitations, workflow alerts, and policy announcements"
        actions={
          unreadCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="size-4" /> Mark all as read
            </Button>
          ) : undefined
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title="All Notifications"
          value={isLoading ? "..." : totalCount}
          description="Total received"
          icon={<Bell className="h-5 w-5" />}
          variant="primary"
        />
        <StatCard
          title="Unread Alerts"
          value={isLoading ? "..." : unreadCount}
          description="Needs attention"
          icon={<ShieldAlert className="h-5 w-5" />}
          variant={unreadCount > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Acknowledged"
          value={isLoading ? "..." : totalCount - unreadCount}
          description="Read notifications"
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="default"
        />
      </StatsOverviewGrid>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-card border rounded-xl p-2 shadow-xs">
        <Button
          variant={!unreadOnly ? "default" : "ghost"}
          size="sm"
          className="text-xs h-7"
          onClick={() => setUnreadOnly(false)}
        >
          All Notifications ({totalCount})
        </Button>
        <Button
          variant={unreadOnly ? "default" : "ghost"}
          size="sm"
          className="text-xs h-7"
          onClick={() => setUnreadOnly(true)}
        >
          Unread Only ({unreadCount})
        </Button>
      </div>

      {/* Notifications List */}
      <div className="bg-card border rounded-xl divide-y overflow-hidden shadow-xs">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            You have no notifications at this time.
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !n.readAt;
            return (
              <div
                key={n.id}
                className={cn(
                  "p-4 flex items-center justify-between gap-4 transition-colors hover:bg-muted/30",
                  isUnread && "bg-primary/5 font-medium"
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-secondary text-foreground mt-0.5">
                    {getModuleIcon(n.module)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold leading-tight">{n.title}</h4>
                      {isUnread && (
                        <span className="size-2 rounded-full bg-red-600 animate-pulse" />
                      )}
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {n.module}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">{n.body}</p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {format(new Date(n.createdAt), "PPp")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => markReadMutation.mutate(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                  {n.linkTo && (
                    <Button variant="outline" size="sm" asChild className="gap-1 text-xs h-8">
                      <a href={n.linkTo}>
                        Open <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
