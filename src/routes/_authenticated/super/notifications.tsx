import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, Save, RefreshCw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/notifications")({
  component: NotificationTemplatesAdmin,
});

export type NotificationTemplate = {
  id: string;
  trigger_event: string;
  channel: "in_app" | "email" | "sms" | "push";
  title_template: string;
  body_template: string;
  enabled: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationTemplate[] = [
  {
    id: "n-1",
    trigger_event: "Leave Request Submitted",
    channel: "in_app",
    title_template: "New Leave Application",
    body_template: "{{employee_name}} has applied for {{leave_days}} days of {{leave_type}} leave.",
    enabled: true,
  },
  {
    id: "n-2",
    trigger_event: "Payroll Released",
    channel: "push",
    title_template: "Salary Processed 💸",
    body_template: "Your salary for {{month}} has been deposited to your bank account.",
    enabled: true,
  },
  {
    id: "n-3",
    trigger_event: "Support Ticket Reply",
    channel: "email",
    title_template: "Reply to Ticket #{{ticket_id}}",
    body_template: "Support agent replied: {{reply_snippet}}",
    enabled: true,
  },
];

function NotificationTemplatesAdmin() {
  const qc = useQueryClient();

  // 1. REALTIME QUERY: Fetch notification triggers from Supabase
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["realtime-notification-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-notification-templates").maybeSingle();
      if (data?.content && Array.isArray((data.content as any).notifications)) {
        return (data.content as any).notifications as NotificationTemplate[];
      }
      return DEFAULT_NOTIFICATIONS;
    },
  });

  const list = notifications ?? DEFAULT_NOTIFICATIONS;

  // 2. REALTIME MUTATION: Save triggers to Supabase
  const saveMutation = useMutation({
    mutationFn: async (updatedList: NotificationTemplate[]) => {
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-notification-templates",
        title: "System Notification Templates",
        meta_description: "Realtime notification triggers and push templates",
        content: { notifications: updatedList } as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification triggers synced with Supabase");
      qc.invalidateQueries({ queryKey: ["realtime-notification-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleStatus(id: string) {
    const updated = list.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n));
    saveMutation.mutate(updated);
  }

  function updateTemplate(id: string, field: "title_template" | "body_template", val: string) {
    const updated = list.map((n) => (n.id === id ? { ...n, [field]: val } : n));
    saveMutation.mutate(updated);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Notification Templates</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Bell className="size-3 text-primary" /> Realtime Triggers ({list.length})
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Configure system notification triggers for In-App, Push Notifications, SMS, and Email events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button onClick={() => saveMutation.mutate(list)} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Triggers
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((n) => (
            <Card key={n.id} className="p-5 border space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-semibold text-xs">
                  {n.trigger_event}
                </Badge>
                <Switch checked={n.enabled} onCheckedChange={() => toggleStatus(n.id)} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Title Template</Label>
                <Input
                  value={n.title_template}
                  onChange={(e) => updateTemplate(n.id, "title_template", e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Body Template</Label>
                <Textarea
                  value={n.body_template}
                  onChange={(e) => updateTemplate(n.id, "body_template", e.target.value)}
                  rows={3}
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span className="capitalize font-mono">Channel: {n.channel}</span>
                <Badge variant={n.enabled ? "default" : "secondary"} className="text-[10px]">
                  {n.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
