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
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/hr/notifications")({
  component: HrNotificationsPage,
  head: () => ({ meta: [{ title: "Notification Center — Master HRMS" }] }),
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

export function HrNotificationsPage() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("all");

  const { data, isLoading } = useQuery<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }>({
    queryKey: ["hr-notifications-list", unreadOnly, moduleFilter],
    queryFn: async () => {
      const res = await api.get<any>("/hr/notifications", {
        params: {
          unread: unreadOnly ? "true" : "false",
          limit: 50,
          module: moduleFilter !== "all" ? moduleFilter : undefined,
        },
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
      queryClient.invalidateQueries({ queryKey: ["hr-notifications-list"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/shared/notifications/read-all");
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["hr-notifications-list"] });
    },
  });

  const getModuleIcon = (module: string) => {
    const mod = module?.toUpperCase() || "";
    if (mod.startsWith("CALENDAR") || mod === "MEETINGS") {
      return <Calendar className="size-4 text-indigo-500" />;
    }
    if (mod === "PUNCH" || mod === "ATTENDANCE") {
      return <Clock className="size-4 text-blue-500" />;
    }
    if (mod === "LEAVE") {
      return <Calendar className="size-4 text-amber-500" />;
    }
    if (mod === "PAYROLL" || mod === "INVOICE" || mod === "BILLING") {
      return <CreditCard className="size-4 text-emerald-500" />;
    }
    if (mod === "CHAT" || mod === "MESSAGE") {
      return <MessageSquare className="size-4 text-purple-500" />;
    }
    if (mod === "TRAINING") {
      return <GraduationCap className="size-4 text-purple-500" />;
    }
    if (mod === "ASSETS") {
      return <Laptop className="size-4 text-emerald-500" />;
    }
    if (mod === "DOCUMENTS") {
      return <FileText className="size-4 text-amber-500" />;
    }
    return <Bell className="size-4 text-primary" />;
  };

  const MODULE_TABS = [
    { key: "all", label: "All" },
    { key: "calendar", label: "Calendar" },
    { key: "attendance", label: "Attendance" },
    { key: "leave", label: "Leave" },
    { key: "payroll", label: "Payroll" },
    { key: "system", label: "System" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Center"
        description="Comprehensive audit of all administrative alerts, workflow triggers, and enterprise events"
        actions={
          unreadCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title="Total Notifications"
          value={isLoading ? "..." : totalCount}
          description="In this workspace"
          icon={Bell}
          variant="primary"
        />
        <StatCard
          title="Unread Alerts"
          value={isLoading ? "..." : unreadCount}
          description="Awaiting review"
          icon={ShieldAlert}
          variant={unreadCount > 0 ? "accent" : "secondary"}
        />
        <StatCard
          title="Read Notifications"
          value={isLoading ? "..." : totalCount - unreadCount}
          description="Reviewed notifications"
          icon={CheckCircle2}
          variant="secondary"
        />
      </StatsOverviewGrid>

      {/* Filter Tabs & Module Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-xl p-2.5 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {MODULE_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={moduleFilter === tab.key ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7.5 px-2.5"
              onClick={() => setModuleFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
          <Button
            variant={!unreadOnly ? "secondary" : "ghost"}
            size="sm"
            className="text-xs h-7.5"
            onClick={() => setUnreadOnly(false)}
          >
            All Status ({totalCount})
          </Button>
          <Button
            variant={unreadOnly ? "secondary" : "ghost"}
            size="sm"
            className="text-xs h-7.5"
            onClick={() => setUnreadOnly(true)}
          >
            Unread ({unreadCount})
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-card border rounded-xl divide-y overflow-hidden shadow-xs">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No notifications found.
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
                    <div className="flex items-start gap-2 flex-wrap min-w-0">
                      <h4 className="text-sm font-semibold leading-tight break-words min-w-0" title={n.title}>
                        {n.title}
                      </h4>
                      {isUnread && (
                        <span className="size-2 rounded-full bg-red-600 animate-pulse mt-1 shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                        {n.module}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 break-words leading-relaxed" title={n.body}>
                      {n.body}
                    </p>

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
                        View <ExternalLink className="size-3" />
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
